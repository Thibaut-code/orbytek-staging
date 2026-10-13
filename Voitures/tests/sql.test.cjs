const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('SQL : installation, RLS, limites des photos et cycle de nettoyage', async () => {
    const db = new PGlite();
    try {
        // Reproduire les schemas/roles fournis par Supabase sans accès à la base réelle.
        await db.exec(`
            create role anon; create role authenticated;
            create schema auth; create schema storage;
            create table auth.users(id uuid primary key, email text);
            create function auth.uid() returns uuid language sql stable as $$
                select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
            $$;
            grant usage on schema auth, storage to anon, authenticated;
            grant execute on function auth.uid() to anon, authenticated;
            create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
            create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
            alter table storage.objects enable row level security;
            grant select, insert, delete on storage.objects to anon, authenticated;
        `);
        const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'setup.sql'), 'utf8');
        await db.exec(sql);
        await db.exec(sql); // Réexécution sans doublons ni perte de données.
        const adminId = '11111111-1111-4111-8111-111111111111';
        const guestId = '22222222-2222-4222-8222-222222222222';
        const carId = '33333333-3333-4333-8333-333333333333';
        const fileId = '44444444-4444-4444-8444-444444444444';
        await db.query('insert into auth.users values ($1, $2), ($3, $4)', [adminId, 'admin@example.be', guestId, 'guest@example.be']);
        await db.query('insert into public.vehicle_admins values ($1)', [adminId]);
        const insert = `insert into public.voitures(id,marque,modele,annee,km,prix,carburant,boite,categorie,photos)
            values ($1,'Toyota','Yaris',2022,40000,15000,'Hybride','Automatique','Citadine',$2::jsonb)`;
        async function role(name, uid = '') {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
            await db.exec(`set role ${name}`);
        }
        await role('anon');
        assert.equal((await db.query('select * from public.voitures')).rows.length, 0);
        await assert.rejects(db.query(insert, [carId, '[]']), /permission denied/);
        await assert.rejects(db.query('select * from public.vehicle_admins'), /permission denied/);
        await role('authenticated', guestId);
        assert.equal((await db.query('select * from public.vehicle_admins')).rows.length, 0);
        await assert.rejects(db.query(insert, [carId, '[]']), /row-level security/);
        await assert.rejects(db.query('insert into public.vehicle_admins values ($1)', [guestId]), /permission denied/);
        await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('vehicle-photos','invalid.webp')"), /row-level security/);

        await role('authenticated', adminId);
        const photo = { path: `${carId}/${fileId}.webp`, thumb: `${carId}/${fileId}-thumb.webp`, width: 1600, height: 1000 };
        await assert.rejects(db.query(insert, [carId, JSON.stringify(Array(11).fill(photo))]), /check constraint/);
        await assert.rejects(db.query(insert, [carId, JSON.stringify([{ ...photo, path: 'https://external/image.jpg' }])]), /check constraint/);
        await db.query('insert into public.vehicle_photo_cleanup(path) values ($1), ($2)', [photo.path, photo.thumb]);
        await db.query("insert into storage.objects(bucket_id,name) values ('vehicle-photos',$1), ('vehicle-photos',$2)", [photo.path, photo.thumb]);
        await db.query(insert, [carId, JSON.stringify([photo])]);
        assert.equal((await db.query('select * from public.vehicle_photo_cleanup')).rows.length, 0);
        // Un objet publié ne peut pas être supprimé via l'API Storage.
        assert.equal((await db.query('delete from storage.objects where name=$1 returning id', [photo.path])).rows.length, 0);

        await role('authenticated', guestId);
        assert.equal((await db.query('update public.voitures set prix=1 returning id')).rows.length, 0);
        assert.equal((await db.query('delete from public.voitures returning id')).rows.length, 0);
        assert.equal((await db.query('select * from public.vehicle_photo_cleanup')).rows.length, 0);
        await role('anon');
        assert.equal((await db.query('select prix from public.voitures')).rows[0].prix, 15000);
        assert.deepEqual((await db.query('select * from public.vehicle_brands()')).rows, [{ marque: 'Toyota' }]);

        await role('authenticated', adminId);
        const stamp = (await db.query('select updated_at::text from public.voitures')).rows[0].updated_at;
        await db.query("update public.voitures set photos='[]'::jsonb, dispo=false where id=$1", [carId]);
        const pending = (await db.query('select path, not_before <= now() as ready from public.vehicle_photo_cleanup')).rows;
        assert.equal(pending.length, 2);
        assert.ok(pending.every(row => row.ready));
        assert.notEqual((await db.query('select updated_at::text from public.voitures')).rows[0].updated_at, stamp);
        assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 2);
        await db.query('delete from public.voitures where id=$1', [carId]);
        assert.equal((await db.query('select * from public.voitures')).rows.length, 0);
        await db.exec('reset role');
        const bucket = (await db.query("select * from storage.buckets where id='vehicle-photos'")).rows[0];
        assert.equal(Number(bucket.file_size_limit), 1048576);
        assert.deepEqual(bucket.allowed_mime_types, ['image/webp']);
    } finally { await db.close(); }
});

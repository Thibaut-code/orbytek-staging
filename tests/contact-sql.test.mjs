// Optional isolated PostgreSQL engine: npm install --prefix <temp> @electric-sql/pglite
// Set CONTACT_PGLITE_PATH to its dist/index.js. Never connects to Supabase.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
test('contact migration, private access, queue, receipts and delivery events in PostgreSQL', {skip:!process.env.CONTACT_PGLITE_PATH}, async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.CONTACT_PGLITE_PATH));
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('../Facture/supabase/migrations/20261104_orbytek_contact.sql',import.meta.url),'utf8'));
  const query=(sql,args=[])=>db.query(sql,args);
  const receipt=n=>`49f75e8b-3467-49db-8ced-${String(n).padStart(12,'0')}`;
  const data={name:'Alice',email:'alice@example.com',phone:'',company:'',project:'Site web',message:'Bonjour',origin:'https://orbytek.be'};
  const enqueue=async(n,hash='hash')=>(await query('select orbytek_contact_enqueue($1,$2,$3,$4) result',[receipt(n),hash,JSON.stringify(data),['ip-hour','email-hour']])).rows[0].result;
  assert.equal(await enqueue(1),'accepted');assert.equal(await enqueue(1),'accepted');assert.equal(await enqueue(1,'different'),'conflict');
  assert.equal((await query('select hits from orbytek_contact_limits limit 1')).rows[0].hits,1);
  for(let n=2;n<=5;n++)assert.equal(await enqueue(n),'accepted');
  assert.equal(await enqueue(6),'limited');assert.equal((await query('select count(*)::int n from orbytek_contact_requests')).rows[0].n,5);
  await db.exec('set role anon');await assert.rejects(query('select * from orbytek_contact_requests'));await assert.rejects(query('select orbytek_contact_claim()'));await db.exec('reset role');
  await db.exec('set role authenticated');await assert.rejects(query('select * from orbytek_contact_requests'));await db.exec('reset role');
  const claimed=(await query('select * from orbytek_contact_claim()')).rows;assert.equal(claimed.length,5);assert.equal(claimed[0].attempts,1);
  assert.equal((await query('select * from orbytek_contact_claim()')).rows.length,0);
  const row=claimed[0];
  await query('select orbytek_contact_finish($1,$2,$3,$4,$5)',[row.id,crypto.randomUUID(),'wrong',null,true]);
  assert.equal((await query('select notification_status from orbytek_contact_requests where id=$1',[row.id])).rows[0].notification_status,'processing');
  await query('select orbytek_contact_finish($1,$2,$3,$4,$5)',[row.id,row.lease_token,null,'timeout',true]);
  assert.equal((await query('select notification_status from orbytek_contact_requests where id=$1',[row.id])).rows[0].notification_status,'pending');
  await query("update orbytek_contact_requests set next_attempt_at=now()-interval '1 second' where id=$1",[row.id]);
  const retry=(await query('select * from orbytek_contact_claim()')).rows[0];assert.equal(retry.id,row.id);assert.equal(retry.attempts,2);
  // Delivery can arrive before the worker stores the provider id.
  await query('select orbytek_contact_event($1,$2,$3,$4)',['event-1','provider-1','delivered','2026-11-04T12:00:00Z']);
  await query('select orbytek_contact_finish($1,$2,$3,$4,$5)',[retry.id,retry.lease_token,'provider-1',null,true]);
  let saved=(await query('select * from orbytek_contact_requests where id=$1',[retry.id])).rows[0];assert.equal(saved.notification_status,'sent');assert.equal(saved.delivery_status,'delivered');
  await query('select orbytek_contact_event($1,$2,$3,$4)',['older','provider-1','delayed','2026-11-04T11:00:00Z']);
  await query('select orbytek_contact_event($1,$2,$3,$4)',['event-1','provider-1','delivered','2026-11-04T12:00:00Z']);
  assert.equal((await query('select delivery_status from orbytek_contact_requests where id=$1',[retry.id])).rows[0].delivery_status,'delivered');
  await db.exec("update orbytek_contact_requests set lease_until=now()-interval '1 second', created_at=now()-interval '24 hours' where notification_status='processing'");
  await query('select * from orbytek_contact_claim()');
  assert.equal((await query("select count(*)::int n from orbytek_contact_requests where notification_status='failed'")).rows[0].n,4);
  // Failed notifications retain the entire original request.
  assert.equal((await query('select count(*)::int n from orbytek_contact_requests')).rows[0].n,5);
 }finally{await db.close();}
});

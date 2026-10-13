// Backend entièrement local aux tests. Aucune connexion Supabase.
(() => {
    const seed = Array.from({ length: 14 }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        marque: i % 2 ? 'Toyota' : 'BMW', modele: i === 0 ? '<img src=x onerror=alert(1)>' : `Modèle ${i + 1}`,
        annee: 2022, km: 32000, prix: i % 2 ? 18000 : 34000, categorie: i % 2 ? 'SUV' : 'Berline',
        carburant: i % 2 ? 'Hybride' : 'Diesel', boite: 'Automatique', badge: '', dispo: true,
        photos: [{ path: 'test-1.webp', thumb: 'test-1-thumb.webp', width: 1600, height: 1000 }, { path: 'test-2.webp', thumb: 'test-2-thumb.webp', width: 1600, height: 1000 }],
        created_at: new Date(2026, 8, 1, 0, 0, i).toISOString(), updated_at: '2026-09-01T00:00:00.000Z'
    }));
    const stored = sessionStorage.getItem('autoprime-test-cars');
    const tables = { voitures: stored ? JSON.parse(stored) : seed, vehicle_admins: [{ user_id: 'test-admin' }], vehicle_photo_cleanup: [] };
    let signedIn = false;
    let callback;
    const session = { user: { id: 'test-admin', email: 'test@example.be' } };
    const persist = () => sessionStorage.setItem('autoprime-test-cars', JSON.stringify(tables.voitures));
    class Query {
        constructor(table) { this.table = table; this.filters = []; this.orders = []; this.action = 'select'; }
        select(columns, options = {}) { this.columns = columns; this.count = options.count; return this; }
        eq(key, value) { this.filters.push(r => r[key] === value); return this; }
        lte(key, value) { this.filters.push(r => r[key] <= value); return this; }
        gte(key, value) { this.filters.push(r => r[key] >= value); return this; }
        in(key, values) { this.filters.push(r => values.includes(r[key])); return this; }
        order(key, options = {}) { this.orders.push([key, options.ascending !== false]); return this; }
        range(start, end) { this.start = start; this.end = end; return this; }
        limit(count) { this.start = 0; this.end = count - 1; return this; }
        single() { this.one = true; return this; }
        maybeSingle() { this.one = true; return this; }
        insert(values) { this.action = 'insert'; this.values = Array.isArray(values) ? values : [values]; return this; }
        update(values) { this.action = 'update'; this.values = values; return this; }
        delete() { this.action = 'delete'; return this; }
        then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
        execute() {
            if (this.action !== 'select' && !signedIn) return { data: null, error: { message: 'permission denied' } };
            const table = tables[this.table];
            let rows = table.filter(row => this.filters.every(filter => filter(row)));
            if (this.action === 'insert') {
                if (this.table === 'voitures' && this.values.some(row => table.some(item => item.id === row.id))) return { data: null, error: { message: 'duplicate id' } };
                rows = this.values.map(row => ({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
                table.push(...rows);
            }
            if (this.action === 'update') for (const row of rows) Object.assign(row, this.values, { updated_at: new Date().toISOString() });
            if (this.action === 'delete') tables[this.table] = table.filter(row => !rows.includes(row));
            if (this.table === 'voitures' && this.action !== 'select') persist();
            for (const [key, ascending] of [...this.orders].reverse()) rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (ascending ? 1 : -1));
            const count = rows.length;
            if (this.start !== undefined) rows = rows.slice(this.start, this.end + 1);
            return { data: this.one ? rows[0] || null : JSON.parse(JSON.stringify(rows)), count, error: null };
        }
    }
    window.supabase = { createClient: () => ({
        from: table => new Query(table),
        rpc: async () => ({ data: [...new Set(tables.voitures.map(car => car.marque))].sort().map(marque => ({ marque })), error: null }),
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            signInWithPassword: async ({ email, password }) => {
                if (email !== 'test@example.be' || password !== 'test-password') return { error: { message: 'Invalid credentials' } };
                signedIn = true;
                callback?.('SIGNED_IN', session);
                return { data: { session }, error: null };
            },
            signOut: async () => { signedIn = false; callback?.('SIGNED_OUT', null); return { error: null }; },
            onAuthStateChange: fn => { callback = fn; }
        },
        storage: { from: () => ({
            getPublicUrl: () => ({ data: { publicUrl: '../placeholder.svg' } }),
            upload: async (path, blob) => ({ data: { path }, error: blob.size > 1048576 || blob.type !== 'image/webp' ? { message: 'invalid file' } : null }),
            remove: async () => ({ data: [], error: null })
        }) }
    }) };
    // Le test d'import fabrique un PNG local sans dépendre du sélecteur de fichiers du navigateur.
    if (document.getElementById('photoInput')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Injecter une photo de test';
        button.className = 'admin-btn secondary';
        button.addEventListener('click', async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2400;
            canvas.height = 1600;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 2400, 1600);
            gradient.addColorStop(0, '#1a56db');
            gradient.addColorStop(1, '#f59e0b');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 2400, 1600);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const transfer = new DataTransfer();
            transfer.items.add(new File([blob], 'test.png', { type: 'image/png' }));
            const input = document.getElementById('photoInput');
            if (input.disabled || document.getElementById('vehicleFields').disabled) return;
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        document.getElementById('photoInput').parentElement.after(button);
    }
})();

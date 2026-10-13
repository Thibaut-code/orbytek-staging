/* Accès partagé à Supabase. Les autorisations sont imposées par les policies SQL. */
(() => {
    let client;
    const config = window.AUTOPRIME_CONFIG || {};
    function getClient() {
        if (!config.supabaseUrl || !config.supabasePublicKey) {
            throw new Error('La connexion au stock n’est pas encore configurée.');
        }
        if (!window.supabase) throw new Error('Impossible de charger la connexion. Vérifiez votre connexion Internet.');
        if (!client) client = window.supabase.createClient(config.supabaseUrl, config.supabasePublicKey);
        return client;
    }
    function imageUrl(path) {
        if (!path) return '';
        return getClient().storage.from(config.photoBucket).getPublicUrl(path).data.publicUrl;
    }
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    // Les échecs de suppression restent en file pour être retentés à la prochaine connexion.
    async function cleanupPhotos() {
        const db = getClient();
        const { data, error } = await db.from('vehicle_photo_cleanup').select('path')
            .lte('not_before', new Date().toISOString()).order('not_before').limit(100);
        if (error) throw error;
        if (!data.length) return;
        const paths = data.map(row => row.path);
        const removed = await db.storage.from(config.photoBucket).remove(paths);
        if (removed.error) throw removed.error;
        const deleted = await db.from('vehicle_photo_cleanup').delete().in('path', paths);
        if (deleted.error) throw deleted.error;
    }
    window.VehicleData = { getClient, imageUrl, escapeHtml, cleanupPhotos };
})();

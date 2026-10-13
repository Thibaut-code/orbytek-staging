(() => {
    const $ = id => document.getElementById(id);
    const form = $('vehicleForm');
    let db;
    let cars = [];
    let carCount = 0;
    let page = 0;
    let editing = null;
    let draftId;
    let photos = [];
    let dirty = false;
    let busy = false;
    let authRequest = 0;
    const PAGE_SIZE = 50;

    function message(text, warning = false) {
        $('adminMessage').textContent = text;
        $('adminMessage').className = `admin-alert ${warning ? 'warning' : 'info'}`;
        $('adminMessage').hidden = !text;
    }
    function setBusy(value) {
        busy = value;
        $('vehicleFields').disabled = value;
        $('loginFields').disabled = value;
        for (const id of ['newCarBtn', 'logoutBtn', 'moreAdminCars']) $(id).disabled = value;
        $('adminCars').querySelectorAll('button').forEach(button => button.disabled = value);
    }
    function discardEditor() {
        photos.forEach(photo => { if (photo.preview) URL.revokeObjectURL(photo.preview); });
        photos = [];
        editing = null;
        dirty = false;
        $('editorPanel').hidden = true;
        form.reset();
        $('photoPreviews').replaceChildren();
        $('photoProgress').textContent = '';
    }
    function canDiscard() {
        return !busy && (!dirty || confirm('Quitter sans enregistrer vos modifications ?'));
    }
    async function listCars(append = false) {
        const nextPage = append ? page + 1 : 0;
        const { data, error, count } = await db.from('voitures').select('*', { count: 'exact' })
            .order('created_at', { ascending: false }).order('id')
            .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        page = nextPage;
        cars = append ? [...cars, ...data] : data;
        carCount = count;
        renderCars();
    }
    function renderCars() {
        const esc = VehicleData.escapeHtml;
        $('carsSummary').textContent = carCount ? `${carCount} voiture${carCount > 1 ? 's' : ''} dans votre stock.` : 'Votre stock est vide. Ajoutez votre première voiture.';
        $('moreAdminCars').hidden = cars.length >= carCount;
        $('adminCars').innerHTML = cars.map(car => `<article class="admin-car-row">
            <img src="${esc(car.photos[0] ? VehicleData.imageUrl(car.photos[0].thumb) : 'placeholder.svg')}" alt="" loading="lazy" width="120" height="80"/>
            <div class="admin-car-description"><h3>${esc(car.marque)} ${esc(car.modele)}</h3><p>${car.annee} · ${car.km.toLocaleString('fr-FR')} km · ${car.prix.toLocaleString('fr-FR')} €</p><span class="stock-status ${car.dispo ? '' : 'sold'}">${car.dispo ? 'Disponible' : 'Vendue'}</span></div>
            <div class="admin-row-actions"><button type="button" data-action="edit" data-id="${car.id}">Modifier</button><button type="button" data-action="status" data-id="${car.id}">${car.dispo ? 'Marquer vendue' : 'Remettre en vente'}</button><button type="button" class="danger" data-action="delete" data-id="${car.id}">Supprimer</button></div>
        </article>`).join('');
    }
    function openEditor(car = null) {
        if (!canDiscard()) return;
        discardEditor();
        editing = car;
        draftId = car?.id || crypto.randomUUID();
        $('editorTitle').textContent = car ? 'Modifier la voiture' : 'Ajouter une voiture';
        if (car) {
            for (const field of ['marque', 'modele', 'annee', 'km', 'prix', 'categorie', 'carburant', 'boite', 'badge', 'dispo']) {
                form.elements[field].value = String(car[field]);
            }
            photos = car.photos.map(stored => ({ stored }));
        }
        renderPhotos();
        $('editorPanel').hidden = false;
        $('editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        form.elements.marque.focus({ preventScroll: true });
    }
    function renderPhotos() {
        const container = $('photoPreviews');
        container.replaceChildren();
        photos.forEach((photo, i) => {
            const card = document.createElement('div');
            card.className = 'photo-preview';
            const img = document.createElement('img');
            img.src = photo.preview || VehicleData.imageUrl(photo.stored.thumb);
            img.alt = `Photo ${i + 1}`;
            img.width = 200;
            img.height = 140;
            card.append(img);
            const label = document.createElement('p');
            label.textContent = i === 0 ? 'Photo principale' : `Photo ${i + 1}`;
            card.append(label);
            if (photo.optimized) {
                const size = document.createElement('small');
                size.textContent = `${Math.round(photo.optimized.full.size / 1024)} Ko + miniature`;
                card.append(size);
            }
            for (const [text, action, disabled] of [
                ['←', () => { [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]]; }, i === 0],
                ['→', () => { [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]]; }, i === photos.length - 1],
                ['Retirer', () => { if (photo.preview) URL.revokeObjectURL(photo.preview); photos.splice(i, 1); }, false]
            ]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = text;
                button.disabled = disabled;
                button.setAttribute('aria-label', text === '←' ? `Avancer la photo ${i + 1}` : text === '→' ? `Reculer la photo ${i + 1}` : `Retirer la photo ${i + 1}`);
                button.addEventListener('click', () => { action(); dirty = true; renderPhotos(); });
                card.append(button);
            }
            container.append(card);
        });
        $('photoInput').disabled = photos.length >= VehiclePhotos.MAX_PHOTOS;
    }
    async function cleanup() {
        try { await VehicleData.cleanupPhotos(); return true; }
        catch (error) { console.error('Nettoyage différé des photos:', error); return false; }
    }
    async function showSession(session) {
        const request = ++authRequest;
        $('managePanel').hidden = true;
        $('loginPanel').hidden = true;
        if (!session) {
            discardEditor();
            cars = [];
            $('adminCars').replaceChildren();
            $('loginPanel').hidden = false;
            return;
        }
        try {
            const { data, error } = await db.from('vehicle_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
            if (error) throw error;
            if (request !== authRequest) return;
            if (!data) {
                await db.auth.signOut();
                message('Ce compte n’a pas accès à la gestion du garage.', true);
                return;
            }
            await listCars();
            if (request !== authRequest) return;
            $('accountEmail').textContent = session.user.email;
            $('managePanel').hidden = false;
            if (!await cleanup()) message('Le stock est disponible. Le nettoyage des anciennes photos sera retenté à votre prochaine connexion.', true);
        } catch (error) {
            console.error(error);
            $('loginPanel').hidden = false;
            message('Impossible de charger votre espace. Vérifiez votre connexion puis reconnectez-vous.', true);
        }
    }
    $('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        setBusy(true);
        message('Connexion en cours…');
        try {
            const { data, error } = await db.auth.signInWithPassword({
                email: e.currentTarget.elements.email.value.trim(),
                password: e.currentTarget.elements.password.value
            });
            if (error) throw error;
            $('loginForm').reset();
            message('');
            await showSession(data.session);
        } catch (error) { console.error(error); message('Connexion impossible. Vérifiez votre email, votre mot de passe et votre connexion.', true); }
        finally { setBusy(false); }
    });
    $('logoutBtn').addEventListener('click', async () => {
        if (!canDiscard()) return;
        setBusy(true);
        try {
            const { error } = await db.auth.signOut();
            if (error) throw error;
            await showSession(null);
            message('Vous êtes déconnecté.');
        } catch (error) { console.error(error); message('Déconnexion impossible. Réessayez.', true); }
        finally { setBusy(false); }
    });
    $('newCarBtn').addEventListener('click', () => openEditor());
    $('cancelEditBtn').addEventListener('click', () => { if (canDiscard()) discardEditor(); });
    form.addEventListener('input', () => { dirty = true; });
    $('photoInput').addEventListener('change', async e => {
        const files = [...e.target.files];
        e.target.value = '';
        if (photos.length + files.length > VehiclePhotos.MAX_PHOTOS) {
            message('Vous pouvez ajouter au maximum 10 photos par voiture.', true);
            return;
        }
        setBusy(true);
        message('');
        try {
            for (let i = 0; i < files.length; i++) {
                $('photoProgress').textContent = `Préparation de la photo ${i + 1} sur ${files.length}…`;
                const optimized = await VehiclePhotos.optimize(files[i]);
                photos.push({ optimized, preview: URL.createObjectURL(optimized.thumb) });
                dirty = true;
                renderPhotos();
            }
            $('photoProgress').textContent = `${photos.length} photo${photos.length > 1 ? 's' : ''} prête${photos.length > 1 ? 's' : ''}.`;
        } catch (error) { message(error.message, true); $('photoProgress').textContent = 'Les photos déjà préparées sont conservées.'; }
        finally { setBusy(false); }
    });
    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (busy) return;
        const values = Object.fromEntries(new FormData(form));
        setBusy(true);
        let committed = false;
        message('Enregistrement en cours…');
        try {
            const photoRecords = [];
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                if (!photo.stored) {
                    const prefix = `${draftId}/${crypto.randomUUID()}`;
                    const record = { path: `${prefix}.webp`, thumb: `${prefix}-thumb.webp`, width: photo.optimized.width, height: photo.optimized.height };
                    // Si l'onglet est fermé pendant l'envoi, les fichiers seront nettoyés après 24 h.
                    const queued = await db.from('vehicle_photo_cleanup').insert([{ path: record.path }, { path: record.thumb }]);
                    if (queued.error) throw queued.error;
                    for (const [path, blob] of [[record.path, photo.optimized.full], [record.thumb, photo.optimized.thumb]]) {
                        $('photoProgress').textContent = `Envoi de la photo ${i + 1} sur ${photos.length}…`;
                        const result = await db.storage.from(window.AUTOPRIME_CONFIG.photoBucket).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
                        if (result.error) throw result.error;
                    }
                    photo.stored = record;
                }
                photoRecords.push(photo.stored);
            }
            const car = { id: draftId, marque: values.marque.trim(), modele: values.modele.trim(), annee: Number(values.annee), km: Number(values.km), prix: Number(values.prix), categorie: values.categorie, carburant: values.carburant, boite: values.boite, badge: values.badge, dispo: values.dispo === 'true', photos: photoRecords };
            if (!car.marque || !car.modele) throw new Error('Indiquez la marque et le modèle.');
            // La version évite d'écraser une modification faite depuis un autre appareil.
            const result = editing
                ? await db.from('voitures').update(car).eq('id', editing.id).eq('updated_at', editing.updated_at).select('id').maybeSingle()
                : await db.from('voitures').insert(car).select('id').single();
            if (result.error) throw result.error;
            if (!result.data) throw new Error('Cette voiture a changé depuis son ouverture. Rechargez la liste avant de la modifier.');
            committed = true;
            discardEditor();
            const cleaned = await cleanup();
            await listCars();
            message(cleaned ? 'Voiture enregistrée. Elle est visible sur le site.' : 'Voiture enregistrée. Le nettoyage des anciennes photos sera retenté à votre prochaine connexion.');
        } catch (error) {
            console.error(error);
            message(committed ? 'La voiture est enregistrée, mais la liste n’a pas pu être actualisée. Rechargez la page.' : (error.message?.startsWith('Cette voiture') || error.message === 'Indiquez la marque et le modèle.' ? error.message : 'Enregistrement impossible. Vos modifications sont conservées : vérifiez votre connexion puis réessayez. En cas de coupure après l’envoi, rechargez la liste pour vérifier si la voiture a été enregistrée.'), true);
        } finally { setBusy(false); }
    });
    $('adminCars').addEventListener('click', async e => {
        const button = e.target.closest('button[data-action]');
        if (!button || busy) return;
        const car = cars.find(item => item.id === button.dataset.id);
        if (button.dataset.action === 'edit') { openEditor(car); return; }
        if (!canDiscard()) return;
        if (button.dataset.action === 'delete' && !confirm(`Supprimer ${car.marque} ${car.modele} et ses photos ?`)) return;
        setBusy(true);
        let committed = false;
        try {
            let query = button.dataset.action === 'delete' ? db.from('voitures').delete() : db.from('voitures').update({ dispo: !car.dispo });
            const { data, error } = await query.eq('id', car.id).eq('updated_at', car.updated_at).select('id').maybeSingle();
            if (error) throw error;
            if (!data) throw new Error('Cette voiture a changé. Rechargez la page.');
            committed = true;
            discardEditor();
            const cleaned = await cleanup();
            await listCars();
            message(cleaned ? 'Stock mis à jour.' : 'Stock mis à jour. Le nettoyage des photos sera retenté à votre prochaine connexion.');
        } catch (error) { console.error(error); message(committed ? 'Le stock est mis à jour. Rechargez la page pour actualiser la liste.' : 'Impossible de modifier cette voiture. Rechargez la page puis réessayez.', true); }
        finally { setBusy(false); }
    });
    $('moreAdminCars').addEventListener('click', async () => {
        setBusy(true);
        try { await listCars(true); }
        catch (error) { console.error(error); message('Impossible de charger les voitures suivantes. Réessayez.', true); }
        finally { setBusy(false); }
    });
    window.addEventListener('beforeunload', e => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } });
    async function init() {
        try {
            db = VehicleData.getClient();
            const { data, error } = await db.auth.getSession();
            if (error) throw error;
            await showSession(data.session);
            // Ne pas appeler l'API Supabase dans le callback (verrou interne Auth).
            db.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') setTimeout(() => showSession(null), 0);
                if (event === 'SIGNED_IN' && $('managePanel').hidden && !busy) setTimeout(() => showSession(session), 0);
            });
        } catch (error) { console.error(error); message('La gestion du stock n’est pas encore disponible. La connexion Supabase doit être configurée.', true); }
    }
    init();
})();

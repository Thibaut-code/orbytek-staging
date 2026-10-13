const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function photoContext(width = 4000, height = 3000, close = () => {}) {
    const context = { window: {}, Blob, createImageBitmap: async () => ({ width, height, close }), document: {
        createElement: () => {
            const canvas = { width: 1, height: 1 };
            canvas.getContext = () => ({ fillRect() {}, drawImage() {}, fillStyle: '' });
            canvas.toBlob = (callback, type, quality) => callback(new Blob([new Uint8Array(Math.round(canvas.width * canvas.height * quality))], { type }));
            return canvas;
        }
    } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'photos.js'), 'utf8'), context);
    return context.window.VehiclePhotos;
}
test('optimisation : dimensions, poids des deux versions et libération du bitmap', async () => {
    let closed = false;
    const photos = photoContext(4000, 3000, () => { closed = true; });
    const result = await photos.optimize({ type: 'image/jpeg', size: 8 * 1024 * 1024 });
    assert.ok(result.width <= 1600 && result.height <= 1600);
    assert.ok(result.full.size <= 400 * 1024);
    assert.ok(result.thumb.size <= 100 * 1024);
    assert.equal(result.full.type, 'image/webp');
    assert.equal(result.thumb.type, 'image/webp');
    assert.equal(closed, true);
});
test('une petite photo conserve sa résolution', async () => {
    const result = await photoContext(200, 100).optimize({ type: 'image/png', size: 1000 });
    assert.equal(result.width, 200);
    assert.equal(result.height, 100);
});
test('HEIC, fichiers trop lourds et images démesurées sont refusés', async () => {
    await assert.rejects(photoContext().optimize({ type: 'image/heic', size: 1000 }), /JPG/);
    await assert.rejects(photoContext().optimize({ type: 'image/jpeg', size: 26 * 1024 * 1024 }), /25 Mo/);
    await assert.rejects(photoContext(10000, 10000).optimize({ type: 'image/jpeg', size: 1000 }), /trop grande/);
});
test('encodage public : les valeurs ne peuvent pas injecter de balises ou d’attributs', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
    assert.equal(context.window.VehicleData.escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(context.window.VehicleData.escapeHtml(null), '');
    assert.throws(() => context.window.VehicleData.getClient(), /configurée/);
});
test('le nettoyage respecte le délai et conserve la file si Storage échoue', async () => {
    const calls = [];
    let fail = true;
    const query = {
        select() { calls.push('select'); return this; },
        lte(key, value) { assert.equal(key, 'not_before'); assert.ok(!Number.isNaN(Date.parse(value))); calls.push('delay'); return this; },
        order() { return this; }, limit() { return Promise.resolve({ data: [{ path: 'test.webp' }], error: null }); },
        delete() { calls.push('delete'); return this; }, in() { return Promise.resolve({ error: null }); }
    };
    const context = { window: { AUTOPRIME_CONFIG: { supabaseUrl: 'https://example.supabase.co', supabasePublicKey: 'public', photoBucket: 'vehicle-photos' }, supabase: {
        createClient: () => ({ from: () => query, storage: { from: () => ({ remove: async () => ({ error: fail ? new Error('offline') : null }) }) } })
    } } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
    await assert.rejects(context.window.VehicleData.cleanupPhotos(), /offline/);
    assert.equal(calls.includes('delete'), false);
    fail = false;
    await context.window.VehicleData.cleanupPhotos();
    assert.equal(calls.includes('delete'), true);
});

test('galerie : navigation circulaire, sélection et voiture sans photo', () => {
    class Element {
        constructor() { this.children = []; this.attributes = {}; this.listeners = {}; }
        replaceChildren() { this.children = []; }
        append(child) { this.children.push(child); }
        setAttribute(key, value) { this.attributes[key] = value; }
        addEventListener(name, listener) { this.listeners[name] = listener; }
        showModal() { this.open = true; }
        close() { this.open = false; }
    }
    const elements = Object.fromEntries(['photoGallery', 'galleryTitle', 'galleryImage', 'galleryCounter', 'galleryThumbs', 'closeGallery', 'prevPhoto', 'nextPhoto'].map(id => [id, new Element()]));
    const context = {
        allVoitures: [{ id: 'car', marque: 'Toyota', modele: 'Yaris', photos: [{ path: 'full1', thumb: 'thumb1' }, { path: 'full2', thumb: 'thumb2' }] }, { id: 'empty', marque: 'BMW', modele: 'Série 3', photos: [] }],
        VehicleData: { imageUrl: path => `https://images.example/${path}` },
        document: { getElementById: id => elements[id], createElement: () => new Element(), querySelectorAll: () => elements.galleryThumbs.children }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'gallery.js'), 'utf8'), context);
    context.openGallery('car');
    assert.equal(elements.photoGallery.open, true);
    assert.equal(elements.galleryCounter.textContent, '1 / 2');
    elements.nextPhoto.listeners.click();
    assert.equal(elements.galleryCounter.textContent, '2 / 2');
    assert.equal(elements.galleryImage.src, 'https://images.example/full2');
    elements.nextPhoto.listeners.click();
    assert.equal(elements.galleryCounter.textContent, '1 / 2');
    elements.prevPhoto.listeners.click();
    assert.equal(elements.galleryCounter.textContent, '2 / 2');
    elements.galleryThumbs.children[0].listeners.click();
    assert.equal(elements.galleryCounter.textContent, '1 / 2');
    elements.closeGallery.listeners.click();
    assert.equal(elements.photoGallery.open, false);
    context.openGallery('empty');
    assert.equal(elements.galleryCounter.textContent, 'Photos à venir');
    assert.equal(elements.galleryImage.src, 'placeholder.svg');
    assert.equal(elements.nextPhoto.disabled, true);
});

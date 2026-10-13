/* Traitement local : aucune photo originale n'est envoyée ou conservée. */
(() => {
    const MAX_PHOTOS = 10;
    const MAX_UPLOAD_BYTES = 1024 * 1024;
    async function encode(canvas, quality) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob || blob.type !== 'image/webp') {
            throw new Error('Ce navigateur ne peut pas optimiser les photos. Utilisez une version récente de Chrome, Safari ou Firefox.');
        }
        return blob;
    }
    async function resize(image, maxSide, targetBytes) {
        const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Impossible de préparer la photo sur cet appareil.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        let blob;
        for (const quality of [0.82, 0.72, 0.62, 0.50, 0.38]) {
            blob = await encode(canvas, quality);
            if (blob.size <= targetBytes) break;
        }
        while (blob.size > targetBytes && Math.max(canvas.width, canvas.height) > 320) {
            const smaller = document.createElement('canvas');
            smaller.width = Math.max(1, Math.round(canvas.width * 0.8));
            smaller.height = Math.max(1, Math.round(canvas.height * 0.8));
            smaller.getContext('2d').drawImage(canvas, 0, 0, smaller.width, smaller.height);
            canvas.width = smaller.width;
            canvas.height = smaller.height;
            ctx.drawImage(smaller, 0, 0);
            blob = await encode(canvas, 0.72);
        }
        if (blob.size > MAX_UPLOAD_BYTES) throw new Error('Cette photo reste trop volumineuse après optimisation.');
        return { blob, width: canvas.width, height: canvas.height };
    }
    async function optimize(file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            throw new Error('Choisissez des photos JPG, PNG ou WebP. Pour une photo HEIC, exportez-la en JPG.');
        }
        if (file.size > 25 * 1024 * 1024) throw new Error('La photo originale doit peser moins de 25 Mo.');
        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            if (bitmap.width * bitmap.height > 60_000_000) throw new Error('Cette photo est trop grande. Exportez une version plus petite.');
            const full = await resize(bitmap, 1600, 400 * 1024);
            const thumb = await resize(bitmap, 600, 100 * 1024);
            return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
        } catch (error) {
            if (error.name === 'InvalidStateError') throw new Error('Cette photo est illisible. Choisissez un autre fichier.');
            throw error;
        } finally {
            bitmap?.close();
        }
    }
    window.VehiclePhotos = { optimize, MAX_PHOTOS, MAX_UPLOAD_BYTES };
})();

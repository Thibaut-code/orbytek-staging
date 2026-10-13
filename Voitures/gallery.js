let galleryPhotos = [];
let galleryPosition = 0;
let galleryCar;
function openGallery(id) {
    galleryCar = allVoitures.find(car => car.id === id);
    if (!galleryCar) return;
    galleryPhotos = galleryCar.photos || [];
    galleryPosition = 0;
    document.getElementById('galleryTitle').textContent = `${galleryCar.marque} ${galleryCar.modele}`;
    const thumbs = document.getElementById('galleryThumbs');
    thumbs.replaceChildren();
    galleryPhotos.forEach((photo, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Afficher la photo ${i + 1}`);
        const img = document.createElement('img');
        img.src = VehicleData.imageUrl(photo.thumb);
        img.alt = '';
        img.loading = 'lazy';
        img.width = 100;
        img.height = 70;
        button.append(img);
        button.addEventListener('click', () => { galleryPosition = i; renderGalleryPhoto(); });
        thumbs.append(button);
    });
    renderGalleryPhoto();
    document.getElementById('photoGallery').showModal();
}
function renderGalleryPhoto() {
    const photo = galleryPhotos[galleryPosition];
    const img = document.getElementById('galleryImage');
    img.src = photo ? VehicleData.imageUrl(photo.path) : 'placeholder.svg';
    img.alt = `${galleryCar.marque} ${galleryCar.modele}, photo ${galleryPosition + 1}`;
    img.onerror = () => { img.onerror = null; img.src = 'placeholder.svg'; };
    document.getElementById('galleryCounter').textContent = photo ? `${galleryPosition + 1} / ${galleryPhotos.length}` : 'Photos à venir';
    document.getElementById('prevPhoto').disabled = galleryPhotos.length < 2;
    document.getElementById('nextPhoto').disabled = galleryPhotos.length < 2;
    document.querySelectorAll('#galleryThumbs button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === galleryPosition)));
}
function movePhoto(direction) {
    if (!galleryPhotos.length) return;
    galleryPosition = (galleryPosition + direction + galleryPhotos.length) % galleryPhotos.length;
    renderGalleryPhoto();
}
document.getElementById('closeGallery').addEventListener('click', () => document.getElementById('photoGallery').close());
document.getElementById('prevPhoto').addEventListener('click', () => movePhoto(-1));
document.getElementById('nextPhoto').addEventListener('click', () => movePhoto(1));
document.getElementById('photoGallery').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') movePhoto(-1);
    if (e.key === 'ArrowRight') movePhoto(1);
});
document.getElementById('photoGallery').addEventListener('click', e => {
    if (e.target === e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) e.currentTarget.close();
    }
});

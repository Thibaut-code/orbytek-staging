from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parent
source = root.parent / 'POUR-IMPRIMEUR-ALBERT-65-ANS-2026-10-24' / 'PAGES-DANS-L-ORDRE'
out = root / 'temporary'
out.mkdir(exist_ok=True)
pages = []
titles = ['Couverture', 'Sommaire', 'Avant d’être papy', 'Tout commence à Couillet', 'Le garage qui servait de but', 'Son père', 'Neuf ans en pension', 'Les courses avec sa maman', 'Le bon beurre de ferme', 'Une élocution sur le vélo', 'Les Troubadours de l’Eau Noire', 'Il revient avec plus qu’au départ', 'Les surprises des familles d’accueil', 'Des concerts et des disques', 'La mécanique automobile', 'L’homme à tout faire', 'Albert rencontre Marianne', 'Le cavalier et la panne', 'Le jour des fiançailles', 'Le 33 rue de la Ramée', '24 octobre 1981', 'Le premier voyage à deux', 'Arnaud', 'Le doigt et la portière', 'Thibaut et le retour de maternité', 'Un nouveau métier', 'Sa maman', 'Les lunettes dans le sable', 'Le parfum de tante Isabelle', 'Renaud, et de trois', 'Encore une partie', 'Quand les devoirs tournent mal', 'Décembre 1995', 'Renaud dans l’ascenseur', 'Les bonnes habitudes', 'Les vacances sur les chantiers', 'Tout doit être de niveau', 'La fuite au Coca', 'En rejeux', 'Le numéro au téléphone', 'Le piercing à l’arcade', 'À Beaumont, il a ne moufte', 'Renaud et le garage voisin', 'Juste pour goûter', 'Voir du pays, savourer ensemble', 'Une petite moustache pour veiller sur toi', 'Les larmes de papy', 'Papy et Hugo', 'Les vidéos qu’il regarde en douce', 'Une voix qui l’accompagne', 'Une belle famille']
for i, path in enumerate(sorted(source.glob('*.png'))):
    im = Image.open(path).convert('RGB')
    im.thumbnail((1600, 2200))
    name = f'{i+1:03}.webp'
    im.save(out / name, 'WEBP', quality=92, method=6)
    title = path.stem.split('-', 1)[1]
    if i == 0: title = 'Couverture'
    elif i == 1: title = 'Sommaire'
    else:
        title = title.rsplit('-v', 1)[0].split('-', 1)[1].replace('-', ' ').capitalize()
    pages.append({'file': name, 'title': titles[i], 'width': im.width, 'height': im.height, 'source': path.name})
(out / 'manifest.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
images = [Image.open(out / p['file']).convert('RGB') for p in pages]
images[0].save(out / 'album-web.pdf', 'PDF', save_all=True, append_images=images[1:], resolution=150, quality=92)
print(f'{len(pages)} pages optimisées')

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1] / 'reports' / 'screenshots'
items = [('aurelia.png', 'AURELIA / IMMOBILIER'), ('maison-braise.png', 'MAISON BRAISE / RESTAURANT'), ('vert-et-pierre.png', 'VERT & PIERRE / PAYSAGE')]
canvas = Image.new('RGB', (1530, 420), '#101815')
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
draw = ImageDraw.Draw(canvas)
for index, (file, title) in enumerate(items):
    picture = Image.open(root / file).convert('RGB')
    picture.thumbnail((490, 360), Image.Resampling.LANCZOS)
    x = 15 + index * 510
    canvas.paste(picture, (x, 15))
    draw.text((x + 8, 391), title, font=font, fill='#ede8d8')
canvas.save(root / 'sites-premium.jpg', quality=90)

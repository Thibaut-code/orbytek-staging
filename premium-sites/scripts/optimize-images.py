from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public' / 'images'
for source in root.glob('*.jpg'):
    if source.stem == 'panorama':
        continue
    with Image.open(source) as original:
        original = original.convert('RGB')
        for size in (640, 800, 960, 1280, 1920):
            picture = original.copy()
            picture.thumbnail((size, size * 2), Image.Resampling.LANCZOS)
            quality = 52 if source.stem == 'garden-hero' and size <= 960 else (68 if source.stem.endswith('hero') else 76)
            picture.save(root / f'{source.stem}-{size}.webp', 'WEBP', quality=quality, method=6)
        picture = original.copy()
        picture.thumbnail((1280 if source.stem.endswith('hero') else 1000, 2000), Image.Resampling.LANCZOS)
        picture.save(root / f'{source.stem}.webp', 'WEBP', quality=68 if source.stem.endswith('hero') else 76, method=6)
    print(f'Optimisé : {source.stem}')

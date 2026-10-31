"""Export reviewed chapter images, preserving the PAL display aspect ratio."""
import analyze_video as a
import pathlib
times = [1565,2045,2900,4105,4325,4710,6130,7675,8050,8600,8745,8930,9785,10195,10440,11145,12000,12965,13325]
folder = pathlib.Path('thumbnails'); folder.mkdir(exist_ok=True)
for i,t in enumerate(times,1):
    im = a.frame_at(t).resize((480,360))
    im.save(folder / f'{i:02}.jpg',quality=86)
print(f'{len(times)} thumbnails exported')

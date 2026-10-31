"""Create timestamped contact sheets for manual visual chapter review."""
import sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).parent / '.tools'))
import av
from PIL import Image, ImageDraw

out = pathlib.Path('analysis')
out.mkdir(exist_ok=True)
container = av.open('filmthibaut.mp4')
stream = container.streams.video[0]
stream.thread_type = 'AUTO'
duration = float(container.duration / av.time_base)
def frame_at(t):
    container.seek(int(t / stream.time_base), stream=stream, backward=True)
    for frame in container.decode(stream):
        if frame.time is not None and frame.time >= t:
            return frame.to_image()
    return None

def sheet(times, name):
    w,h = 256,216
    canvas = Image.new('RGB',(w*4,h*((len(times)+3)//4)), '#141815')
    draw = ImageDraw.Draw(canvas)
    for i,t in enumerate(times):
        image = frame_at(t)
        if image:
            image.thumbnail((256,192))
            x,y=(i%4)*w,(i//4)*h
            canvas.paste(image,(x+(w-image.width)//2,y))
            draw.text((x+8,y+194),f'{int(t)//3600:02}:{int(t)%3600//60:02}:{int(t)%60:02}',fill='white')
    canvas.save(out / name)
    print(name,flush=True)

if __name__ != '__main__':
    pass
elif len(sys.argv)>1:
    times = [float(x) for x in sys.argv[1].split(',')]
    sheet(times,sys.argv[2] if len(sys.argv)>2 else 'detail.jpg')
else:
    times = list(range(5,int(duration),120))
    for n in range(0,len(times),24): sheet(times[n:n+24],f'overview-{n//24+1}.jpg')
    print(json.dumps({'duration':duration,'codec':stream.codec_context.name,'width':stream.width,'height':stream.height}))

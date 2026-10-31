"""Reduce background tape noise while copying the video stream unchanged."""
import json,pathlib,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import imageio_ffmpeg

source='filmthibaut-son-ameliore.mp4'
output='filmthibaut-son-nettoye.mp4'
filters='highpass=f=60,afftdn=nr=9:nf=-40:tn=1:gs=8,lowpass=f=10000,alimiter=limit=0.841395:level=0:latency=1'
command=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-n','-i',source,
         '-map','0:v:0','-map','0:a:0','-c:v','copy','-af',filters,
         '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',
         '-progress','analysis/denoise-progress.txt',output]
print('Creating',output,flush=True)
with open('analysis/denoise.log','w') as log:
    subprocess.run(command,stdout=subprocess.DEVNULL,stderr=log,check=True)
pathlib.Path('analysis/denoise-report.json').write_text(json.dumps({
    'source':source,'output':output,'filters':filters,'video':'stream copy',
    'description':'Adaptive spectral noise reduction up to 9 dB, 60 Hz high-pass, 10 kHz low-pass, peak limiter with latency compensation.',
    'preview_measurements':'noise-excerpts.json'
},indent=2),encoding='utf-8')
print('Complete',flush=True)

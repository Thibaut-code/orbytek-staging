"""Apply the birth chapter's additional denoising consistently to the entire film."""
import json,pathlib,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import av,imageio_ffmpeg
source='filmthibaut-son-nettoye.mp4'
output='filmthibaut-son-nettoye-v3.mp4'
with av.open(source) as container:
    audio=container.streams.audio[0]
    duration=float(audio.duration*audio.time_base)
filters=f'afftdn=nr=14:nf=-38:tn=1:gs=12,lowpass=f=7500,atrim=start=0.025,asetpts=PTS-STARTPTS,apad,atrim=duration={duration}'
print('Creating',output,flush=True)
with open('analysis/all-denoise.log','w') as log:
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-n','-i',source,
       '-map','0:v:0','-map','0:a:0','-c:v','copy','-af',filters,'-c:a','aac','-b:a','192k','-ar','48000',
       '-movflags','+faststart','-progress','analysis/all-denoise-progress.txt',output],
       stdout=subprocess.DEVNULL,stderr=log,check=True)
pathlib.Path('analysis/all-denoise-report.json').write_text(json.dumps({
 'source':source,'output':output,'filters':filters,'duration':duration,
 'scope':'Entire film, same additional filtering as birth chapter; starting from v1 to avoid doubling the birth treatment',
 'video':'stream copy','latency_compensation_ms':25
},indent=2),encoding='utf-8')
print('Complete',flush=True)

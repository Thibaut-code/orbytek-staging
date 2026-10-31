"""Apply additional noise reduction only to the birth chapter, keeping its timing."""
import json,pathlib,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import imageio_ffmpeg,numpy as np
ff=imageio_ffmpeg.get_ffmpeg_exe()
source='filmthibaut-son-nettoye.mp4'
output='filmthibaut-son-nettoye-v2.mp4'
start,end=1942,2428
duration=end-start
# Compensate the 25 ms FFT filter delay, then trim/pad to the exact chapter length.
clean='afftdn=nr=14:nf=-38:tn=1:gs=12,lowpass=f=7500'
filters=(f'[0:a]asplit=3[a][b][c];'
 f'[a]atrim=end={start},asetpts=PTS-STARTPTS[before];'
 f'[b]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,{clean},'
 f'atrim=start=0.025,asetpts=PTS-STARTPTS,apad,atrim=duration={duration}[birth];'
 f'[c]atrim=start={end},asetpts=PTS-STARTPTS[after];'
 '[before][birth][after]concat=n=3:v=0:a=1[audio]')
# Quantify the quietest frames before/after, using identical excerpts and gain.
measure=[]
for time in [1970,2045,2210,2370]:
    data=[]
    for af in ['anull',clean+',atrim=start=0.025,asetpts=PTS-STARTPTS']:
        raw=subprocess.check_output([ff,'-hide_banner','-loglevel','error','-nostdin','-ss',str(time),
             '-i',source,'-t','20','-vn','-af',af,'-ac','1','-ar','48000','-f','f32le','-'])
        pcm=np.frombuffer(raw,dtype='<f4');frames=pcm[:len(pcm)//4800*4800].reshape(-1,4800)
        rms=np.sqrt(np.mean(frames**2,axis=1))
        data.append(round(float(20*np.log10(max(float(np.quantile(rms,.1)),1e-10))),2))
    measure.append({'time':time,'quiet_before_dbfs':data[0],'quiet_after_dbfs':data[1]})
print(json.dumps(measure),flush=True)
with open('analysis/birth-denoise.log','w') as log:
    subprocess.run([ff,'-hide_banner','-nostdin','-n','-i',source,'-filter_complex',filters,
        '-map','0:v:0','-map','[audio]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000',
        '-movflags','+faststart','-progress','analysis/birth-denoise-progress.txt',output],
        stdout=subprocess.DEVNULL,stderr=log,check=True)
pathlib.Path('analysis/birth-denoise-report.json').write_text(json.dumps({
 'source':source,'output':output,'start':start,'end':end,'filter':clean,
 'filter_latency_compensation_ms':25,'quiet_excerpt_measurements':measure,
 'video':'stream copy','other_chapters':'No additional denoising; audio track encoded as AAC 192 kb/s'
},indent=2),encoding='utf-8')
print('Complete',flush=True)

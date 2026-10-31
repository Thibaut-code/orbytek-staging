"""Estimate quiet-frame levels in representative excerpts; make A/B previews."""
import json,pathlib,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import imageio_ffmpeg,numpy as np
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
source='filmthibaut-son-ameliore.mp4'
FILTER='highpass=f=60,afftdn=nr=9:nf=-40:tn=1:gs=8,lowpass=f=10000'
results=[]
for time in [90,2045,4325,6130,10195,12965]:
    samples=[]
    for af in ['anull',FILTER]:
        command=[ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-ss',str(time),'-i',source,'-t','20','-vn','-af',af,'-ac','1','-ar','48000','-f','f32le','-']
        pcm=np.frombuffer(subprocess.check_output(command),dtype='<f4')
        frames=pcm[:len(pcm)//4800*4800].reshape(-1,4800)
        rms=np.sqrt(np.mean(frames**2,axis=1))
        samples.append({'rms_quiet_10pct_dbfs':round(float(20*np.log10(max(np.quantile(rms,.1),1e-10))),2),'rms_median_dbfs':round(float(20*np.log10(max(np.median(rms),1e-10))),2),'peak_dbfs':round(float(20*np.log10(max(np.max(np.abs(pcm)),1e-10))),2)})
    results.append({'time':time,'before':samples[0],'after':samples[1]})
    print(results[-1],flush=True)
pathlib.Path('analysis/noise-excerpts.json').write_text(json.dumps({'filter':FILTER,'excerpts':results},indent=2))
for suffix,af in [('avant','anull'),('apres',FILTER)]:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-n','-ss','2045','-i',source,'-t','25','-vn','-af',af,'-c:a','libmp3lame','-b:a','192k',f'analysis/extrait-bruit-{suffix}.mp3'],check=True)

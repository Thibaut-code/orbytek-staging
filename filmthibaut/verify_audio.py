"""Verify copied video packets, A/V timing and the encoded audio peak."""
import hashlib,json,pathlib,re,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import av,imageio_ffmpeg

def inspect(path):
    container=av.open(path)
    video=container.streams.video[0]
    audio=container.streams.audio[0]
    result={'duration':float(container.duration/av.time_base),
            'video_duration':float(video.duration*video.time_base),
            'audio_duration':float(audio.duration*audio.time_base),
            'audio_start':float((audio.start_time or 0)*audio.time_base),
            'video_start':float((video.start_time or 0)*video.time_base),
            'audio_codec':audio.codec_context.name,
            'sample_rate':audio.codec_context.sample_rate}
    digest=hashlib.sha256(); count=0
    for packet in container.demux(video):
        if packet.size:
            digest.update(bytes(packet)); count+=1
    result.update(video_sha256=digest.hexdigest(),video_packets=count)
    container.close()
    return result

destination=sys.argv[1] if len(sys.argv)>1 else 'filmthibaut-son-ameliore.mp4'
prefix='all-denoise-verification' if '-v3' in destination else ('birth-denoise-verification' if '-v2' in destination else ('denoise-verification' if 'nettoye' in destination else 'audio-verification'))
source=inspect('filmthibaut.mp4')
output=inspect(destination)
assert source['video_sha256']==output['video_sha256'],'Video bitstream changed'
assert source['video_packets']==output['video_packets'],'Video packet count changed'
assert abs(source['duration']-output['duration'])<0.1,'Container duration changed'
assert abs(source['audio_duration']-output['audio_duration'])<0.1,'Audio duration changed'
with open(f'analysis/{prefix}.log','w') as log:
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-i',
      destination,'-vn','-af','volumedetect','-f','null','-'],
      stderr=log,stdout=subprocess.DEVNULL,check=True)
text=pathlib.Path(f'analysis/{prefix}.log').read_text(errors='replace')
peak=float(re.search(r'max_volume: ([-\d.]+) dB',text).group(1))
assert peak<0,'Encoded audio reaches clipping level'
report={'source':source,'output':output,'encoded_peak_dbfs':peak,
        'checks':'Video bitstream identical; duration and A/V timing preserved; decoded audio peak below 0 dBFS.'}
if 'nettoye' in destination:
    import numpy as np
    def excerpt(path,time):
        raw=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-nostdin',
             '-ss',str(time),'-i',path,'-t','6','-vn','-ac','1','-ar','16000','-f','f32le','-'])
        samples=np.frombuffer(raw,dtype='<f4').astype(np.float64)
        return samples-samples.mean()
    alignment=[]
    for time in ([90,2045,2370,4325,12965] if '-v2' in destination or '-v3' in destination else [90,4325,12965]):
        before=excerpt('filmthibaut-son-ameliore.mp4',time)
        after=excerpt(destination,time)
        length=min(len(before),len(after)); before=before[:length]; after=after[:length]
        size=1<<(2*length-1).bit_length()
        correlation=np.fft.irfft(np.fft.rfft(after,size)*np.conj(np.fft.rfft(before,size)),size)
        lags=np.arange(-800,801)
        lag=int(lags[np.argmax(correlation[lags % size])])
        assert abs(lag)<800,'Audio waveform alignment exceeds 50 ms'
        alignment.append({'time':time,'lag_ms':lag/16})
    report['waveform_alignment']=alignment
pathlib.Path(f'analysis/{prefix}.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)

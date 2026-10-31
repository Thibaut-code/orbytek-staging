"""Reduce streaming container overhead, retaining the encoded video bitstream."""
import json,pathlib,subprocess,sys,shutil
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import imageio_ffmpeg
root=pathlib.Path('publication/Archive');out=root/'media-web';out.mkdir(exist_ok=True)
with open('analysis/web-compact.log','w') as log:
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-n',
     '-i',str(root/'media/film.m3u8'),'-map','0:v:0','-map','0:a:0','-c:v','copy',
     '-c:a','aac','-b:a','64k','-ar','48000','-f','hls','-hls_time','20','-hls_playlist_type','vod',
     '-hls_segment_type','fmp4','-hls_fmp4_init_filename','init.mp4','-hls_flags','independent_segments',
     '-hls_segment_filename',str(out/'archive-%04d.m4s'),'-progress','analysis/web-compact-progress.txt',str(out/'film.m3u8')],
      stdout=subprocess.DEVNULL,stderr=log,check=True)
# This Windows FFmpeg build writes the initialization fragment relative to cwd.
if pathlib.Path('init.mp4').is_file(): shutil.copy2('init.mp4',out/'init.mp4')
assert (out/'init.mp4').is_file(),'Missing fragmented MP4 initialization data'
html=root/'index.html';html.write_text(html.read_text(encoding='utf-8').replace('media/film.m3u8','media-web/film.m3u8'),encoding='utf-8')
files=[p for p in root.rglob('*') if p.is_file() and 'media' not in p.relative_to(root).parts]
size=sum(p.stat().st_size for p in files)
assert size<835_000_000, f'Archive remains too large: {size}'
segments=list(out.glob('*.m4s'))
report={'archive_bytes':size,'segments':len(segments),'files':len(files),'video':'H.264, 720x576, 4:3, 25 fps',
 'audio':'AAC 64 kb/s, same denoised audio','container':'HLS fragmented MP4','exclude_from_publication':'media/',
 'video_reencoded_during_compaction':False}
pathlib.Path('analysis/web-encode-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)

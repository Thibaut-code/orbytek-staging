"""Prepare an isolated, GitHub Pages compatible /Archive publication."""
import json,pathlib,shutil,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import imageio_ffmpeg
root=pathlib.Path('publication/Archive');root.mkdir(parents=True,exist_ok=True)
media=root/'media';media.mkdir(exist_ok=True)
for name in ['index.html','pellicule.css','app.js','chapters.js']:
    shutil.copy2(name,root/name)
shutil.copytree('thumbnails',root/'thumbnails',dirs_exist_ok=True)
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('filmthibaut-son-nettoye-v3.mp4','media/film.m3u8')
html=html.replace('<script src="chapters.js">','<script src="hls.min.js"></script><script src="stream.js"></script><script src="chapters.js">')
(root/'index.html').write_text(html,encoding='utf-8')
filters='scale=720:576:flags=lanczos,setsar=16/15'
cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-n','-i','filmthibaut-son-nettoye-v3.mp4',
 '-map','0:v:0','-map','0:a:0','-vf',filters,'-c:v','libx264','-preset','veryfast','-crf','24',
 '-maxrate','420k','-bufsize','840k','-pix_fmt','yuv420p','-g','100','-keyint_min','100','-sc_threshold','0',
 '-c:a','aac','-b:a','96k','-ar','48000','-f','hls','-hls_time','20','-hls_playlist_type','vod',
 '-hls_flags','independent_segments','-hls_segment_filename',str(media/'archive-%04d.ts'),
 '-progress','analysis/web-encode-progress.txt',str(media/'film.m3u8')]
print('Encoding web stream at original 720x576 resolution / 25 fps',flush=True)
with open('analysis/web-encode.log','w') as log:
    subprocess.run(cmd,stderr=log,stdout=subprocess.DEVNULL,check=True)
size=sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
segments=list(media.glob('*.ts'))
assert size<900_000_000,'Archive exceeds the publication size budget'
assert segments and max(p.stat().st_size for p in segments)<90_000_000
report={'archive_bytes':size,'segments':len(segments),'max_segment_bytes':max(p.stat().st_size for p in segments),
 'format':'HLS / H.264 / AAC 96k','video':'720x576, SAR 16:15, 25 fps','source':'filmthibaut-son-nettoye-v3.mp4'}
pathlib.Path('analysis/web-encode-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)

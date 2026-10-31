"""Two-pass loudness normalization; copy video packets without re-encoding."""
import json, pathlib, re, subprocess, sys
sys.path.insert(0,str(pathlib.Path(__file__).parent / '.tools'))
import imageio_ffmpeg

source = pathlib.Path('filmthibaut.mp4')
destination = pathlib.Path('filmthibaut-son-ameliore.mp4')
log = pathlib.Path('analysis/audio-measurement.log').read_text(errors='replace')
matches = re.findall(r'\{\s*"input_i".*?\}',log,re.S)
if not matches:
    raise SystemExit('La première passe de mesure doit être terminée avant de lancer la correction.')
measured = json.loads(matches[-1])
af = ('loudnorm=I=-18:TP=-1.5:LRA=11:linear=true:print_format=json'
      f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
      f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
      f":offset={measured['target_offset']}")
command = [imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-n',
           '-i',str(source),'-map','0:v:0','-map','0:a:0',
           '-c:v','copy','-af',af,'-c:a','aac','-b:a','192k','-ar','48000',
           '-movflags','+faststart','-progress','analysis/audio-progress.txt',str(destination)]
print('Mesures originales:',json.dumps(measured),flush=True)
with open('analysis/audio-correction.log','w') as output:
    result = subprocess.run(command,stdout=subprocess.DEVNULL,stderr=output)
if result.returncode:
    raise SystemExit(f'FFmpeg failed ({result.returncode}). See analysis/audio-correction.log')
result_log = pathlib.Path('analysis/audio-correction.log').read_text(errors='replace')
out = re.findall(r'\{\s*"input_i".*?\}',result_log,re.S)
report = {'source':str(source),'output':str(destination),'original':measured,
          'correction':json.loads(out[-1]) if out else None,
          'video':'copied without re-encoding','audio_codec':'AAC 192 kb/s, 48 kHz',
          'target_lufs':-18,'true_peak_limit_dbtp':-1.5}
pathlib.Path('analysis/audio-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)

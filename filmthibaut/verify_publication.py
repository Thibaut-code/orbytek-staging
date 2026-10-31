"""Read deployment status, and verify the public page only once its build is ready."""
import json,os,pathlib,subprocess,urllib.request,urllib.error
info=json.loads(pathlib.Path('analysis/publication-commit.json').read_text())
env=dict(os.environ,GIT_TERMINAL_PROMPT='0',GCM_INTERACTIVE='never')
r=subprocess.run(['git','-C','publication/repo','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env)
credential=dict(line.split('=',1) for line in r.stdout.splitlines() if '=' in line)
api_headers={'Accept':'application/vnd.github+json','User-Agent':'Orbytek-Archive-Publication','X-GitHub-Api-Version':'2022-11-28'}
if credential.get('password'):api_headers['Authorization']='Bearer '+credential['password']
url='https://api.github.com/repos/thibaut-code/orbytek/pages/builds/latest'
with urllib.request.urlopen(urllib.request.Request(url,headers=api_headers),timeout=30) as response:
    build=json.load(response)
report={'expected_commit':info['commit'],'build_commit':build.get('commit'),'status':build.get('status'),'error':build.get('error')}
if build.get('status')=='built' and build.get('commit')==info['commit']:
    public_headers={'User-Agent':'Orbytek-Archive-Verification','Cache-Control':'no-cache'}
    for name in ['', 'media-web/film.m3u8','media-web/init.mp4','media-web/archive-0000.m4s','media-web/archive-0670.m4s']:
        req=urllib.request.Request(info['url']+name,headers=public_headers,method='GET' if not name or name.endswith('.m3u8') else 'HEAD')
        with urllib.request.urlopen(req,timeout=45) as response:
            body=response.read() if req.method=='GET' else b''
            report[name or 'page']={'status':response.status,'content_type':response.headers.get('Content-Type'),'bytes':response.headers.get('Content-Length')}
            if not name:assert b'Archive de famille' in body and b'Les souvenirs de Thibaut' in body
            if name.endswith('.m3u8'):assert b'#EXT-X-ENDLIST' in body and b'#EXT-X-MAP:URI="init.mp4"' in body
    report['url']=info['url']
    pathlib.Path('analysis/publication-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)

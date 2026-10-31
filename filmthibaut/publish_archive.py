"""Publish only the reviewed Archive directory to the existing Orbytek main branch."""
import json,pathlib,re,shutil,subprocess
base=pathlib.Path(__file__).resolve().parent
source=base/'publication/Archive';repo=base/'publication/repo';target=repo/'Archive'
playlist=source/'media-web/film.m3u8'
text=playlist.read_text()
assert '#EXT-X-ENDLIST' in text,'Encoding is not complete'
duration=sum(float(x) for x in re.findall(r'#EXTINF:([\d.]+)',text))
assert abs(duration-13401.32)<.2,f'Unexpected duration: {duration}'
segments=[line.strip() for line in text.splitlines() if line and not line.startswith('#')]
for name in segments:
    assert re.fullmatch(r'archive-\d{4}\.m4s',name),name
    assert (playlist.parent/name).is_file(),name
assert (playlist.parent/'init.mp4').is_file()
assert 'media-web/film.m3u8' in (source/'index.html').read_text(encoding='utf-8')
def git(*args,capture=False):
    return subprocess.run(['git','-C',str(repo),*args],check=True,text=True,
                          stdout=subprocess.PIPE if capture else None).stdout
assert not git('status','--porcelain',capture=True).strip(),'Publication checkout has unrelated changes'
git('fetch','origin','main')
git('merge','--ff-only','origin/main')
assert not target.exists(),'Archive already exists: inspect it before updating'
git('config','core.compression','1')
for field in ['user.name','user.email']:
    result=subprocess.run(['git','-C',str(repo),'config','--get',field],text=True,capture_output=True)
    if not result.stdout.strip():
        value=subprocess.check_output(['git','-C',str(base.parent),'config','--get',field],text=True).strip()
        git('config',field,value)
shutil.copytree(source,target,ignore=shutil.ignore_patterns('media'))
archive_size=sum(p.stat().st_size for p in target.rglob('*') if p.is_file())
tree=git('ls-tree','-r','-l','HEAD',capture=True)
existing=sum(int(match.group(1)) for line in tree.splitlines() if (match:=re.match(r'\d+ blob [a-f0-9]+\s+(\d+)\s',line)))
assert archive_size+existing<1_000_000_000,f'Published site exceeds size budget: {archive_size+existing}'
print(json.dumps({'archive_bytes':archive_size,'site_bytes':archive_size+existing,'segments':len(segments),'duration':duration}),flush=True)
git('add','--','Archive')
git('commit','--quiet','-m','Publish family video archive at /Archive')
sha=git('rev-parse','HEAD',capture=True).strip()
(base/'analysis/publication-commit.json').write_text(json.dumps({'commit':sha,'path':'Archive','url':'https://orbytek.be/Archive/','archive_bytes':archive_size,'site_bytes':archive_size+existing},indent=2))
git('-c','http.version=HTTP/1.1','push','--progress','origin','main')
print('Published commit '+sha,flush=True)

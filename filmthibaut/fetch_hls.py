"""Fetch a pinned browser HLS player from its official published npm package."""
import hashlib,json,pathlib,urllib.request
headers={'User-Agent':'Orbytek-Archive-Publication'}
request=urllib.request.Request('https://api.github.com/repos/video-dev/hls.js/releases/latest',headers=headers)
with urllib.request.urlopen(request,timeout=30) as response:
    version=json.load(response)['tag_name'].lstrip('v')
folder=pathlib.Path('publication/Archive')
for source,target in [('dist/hls.min.js','hls.min.js'),('LICENSE','hls.LICENSE.txt')]:
    url=f'https://cdn.jsdelivr.net/npm/hls.js@{version}/{source}'
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45) as response:
        data=response.read()
    (folder/target).write_bytes(data)
report={'version':version,'sha256':hashlib.sha256((folder/'hls.min.js').read_bytes()).hexdigest()}
pathlib.Path('analysis/hls-dependency.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))

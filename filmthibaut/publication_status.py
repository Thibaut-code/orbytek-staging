"""Read the existing Orbytek publication settings without logging credentials."""
import json,os,subprocess,urllib.request
repo='C:/Users/FlowUP/OneDrive/Documents/Github/projet2'
env=dict(os.environ,GIT_TERMINAL_PROMPT='0',GCM_INTERACTIVE='never')
result=subprocess.run(['git','-C',repo,'credential','fill'],input='protocol=https\nhost=github.com\n\n',
                      text=True,capture_output=True,env=env)
credentials=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
token=credentials.get('password')
headers={'Accept':'application/vnd.github+json','User-Agent':'Orbytek-Archive-Publication','X-GitHub-Api-Version':'2022-11-28'}
if token: headers['Authorization']='Bearer '+token
for endpoint in ['', '/pages']:
    url='https://api.github.com/repos/thibaut-code/orbytek'+endpoint
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=30) as response:
            data=json.load(response)
        fields=['full_name','default_branch','size','visibility'] if not endpoint else ['status','cname','html_url','build_type','source']
        print(json.dumps({key:data.get(key) for key in fields}))
    except urllib.error.HTTPError as error:
        print(json.dumps({'endpoint':endpoint,'http_status':error.code}))

// Utilise le gestionnaire d’identifiants existant, sans afficher ni stocker son jeton.
const {spawnSync}=require('node:child_process');
(async()=>{
  const result=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'},timeout:20000,windowsHide:true});
  const password=result.stdout?.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);if(!password)throw Error('Connexion GitHub indisponible dans le gestionnaire existant.');
  const headers={Authorization:`Bearer ${password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  for(const endpoint of ['pages','pages/builds/latest','actions/runs?per_page=3']){
    const response=await fetch(`https://api.github.com/repos/thibaut-code/orbytek/${endpoint}`,{headers});const data=await response.json();
    if(!response.ok){console.log(endpoint,response.status,data.message);continue;}
    if(endpoint==='pages')console.log(JSON.stringify({endpoint,status:data.status,url:data.html_url,source:data.source,build_type:data.build_type}));
    else if(endpoint.startsWith('actions'))console.log(JSON.stringify({endpoint,runs:data.workflow_runs.map(r=>({id:r.id,name:r.name,status:r.status,conclusion:r.conclusion,sha:r.head_sha,url:r.html_url}))}));
    else console.log(JSON.stringify({endpoint,status:data.status,commit:data.commit,error:data.error?.message,updated_at:data.updated_at}));
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});

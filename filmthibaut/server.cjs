const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const allowed = new Set(['index.html','style.css','pellicule.css','app.js','chapters.js','filmthibaut.mp4','filmthibaut-son-ameliore.mp4','filmthibaut-son-nettoye.mp4','filmthibaut-son-nettoye-v2.mp4','filmthibaut-son-nettoye-v3.mp4']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mp4':'video/mp4'};
http.createServer((req,res) => {
  const name = new URL(req.url,'http://localhost').pathname.slice(1) || 'index.html';
  if((!allowed.has(name) && !/^thumbnails\/[\w-]+\.jpg$/.test(name)) || !['GET','HEAD'].includes(req.method)) { res.writeHead(404); return res.end(); }
  const file = path.join(root,name);
  fs.stat(file,(error,stat) => {
    if(error) { res.writeHead(404); return res.end(); }
    const headers = {'Content-Type':types[path.extname(file)] || 'image/jpeg','Accept-Ranges':'bytes'};
    let start = 0, end = stat.size-1, code = 200;
    if(req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match || (!match[1] && !match[2])) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}); return res.end(); }
      start = match[1] ? Number(match[1]) : Math.max(0,stat.size-Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]),end) : end;
      if(start > end || start >= stat.size) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}); return res.end(); }
      code = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = end-start+1; res.writeHead(code,headers);
    if(req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file,{start,end}); stream.on('error',() => res.destroy()); res.on('close',() => stream.destroy()); stream.pipe(res);
  });
}).listen(Number(process.env.PORT || 8080),'127.0.0.1',() => console.log('Local: http://127.0.0.1:'+(process.env.PORT || 8080)));

const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname, types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  let name;try{name=decodeURIComponent(pathname);}catch{res.writeHead(400);return res.end();}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||name.split('/').some(p=>p.startsWith('.')||p==='_private')||!['.html','.js','.css'].includes(path.extname(file))){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end('Introuvable');}res.setHeader('Content-Type',types[path.extname(file)]);res.setHeader('Cache-Control','no-store');res.end(data);});
}).listen(4189,'127.0.0.1',()=>console.log('Questionnaire : http://127.0.0.1:4189/'));

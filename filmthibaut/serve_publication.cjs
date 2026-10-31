const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'publication','Archive');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.m3u8':'application/vnd.apple.mpegurl','.m4s':'video/iso.segment','.mp4':'video/mp4','.ts':'video/mp2t'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/Archive/')){res.writeHead(404);return res.end();}
 let rel;try{rel=decodeURIComponent(url.pathname.slice(9))||'index.html';}catch{res.writeHead(400);return res.end();}
 const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)||!['GET','HEAD'].includes(req.method)){res.writeHead(404);return res.end();}
 fs.stat(file,(err,s)=>{
  if(err||!s.isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':s.size,'Cache-Control':'no-cache'});
  if(req.method==='HEAD')return res.end();
  const stream=fs.createReadStream(file);res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
 });
}).listen(8083,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8083/Archive/'));

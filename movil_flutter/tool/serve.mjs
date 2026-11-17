import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../build/web/', import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const origin=req.headers.origin;
  const cors=['http://127.0.0.1:5191','http://localhost:5191'].includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-CSRFToken,X-XSRF-TOKEN','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'}:{};
  if(url.pathname.startsWith('/api/')){
    if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end();}
    const upstream=http.request({hostname:'127.0.0.1',agent:false,port:url.pathname.startsWith('/api/edu/')?8080:8000,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:5173',connection:'close',...(origin?{origin:'http://127.0.0.1:5173'}:{})}},response=>{res.writeHead(response.statusCode,{...response.headers,...cors});response.pipe(res)});
    upstream.on('error',()=>{res.writeHead(503,{'Content-Type':'application/json',...cors});res.end(JSON.stringify({mensaje:'El servicio está iniciándose. Inténtalo de nuevo.'}))});return req.pipe(upstream);
  }
  try{
    const target=path.resolve(root,url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!target.startsWith(root+path.sep))throw Error();
    const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('No encontrado');}
}).listen(5190,'127.0.0.1',()=>console.log('Flutter: http://127.0.0.1:5190/'));

"use strict";var x=Object.create;var m=Object.defineProperty;var b=Object.getOwnPropertyDescriptor;var w=Object.getOwnPropertyNames;var S=Object.getPrototypeOf,y=Object.prototype.hasOwnProperty;var $=(t,e,o,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let c of w(e))!y.call(t,c)&&c!==o&&m(t,c,{get:()=>e[c],enumerable:!(a=b(e,c))||a.enumerable});return t};var l=(t,e,o)=>(o=t!=null?x(S(t)):{},$(e||!t||!t.__esModule?m(o,"default",{value:t,enumerable:!0}):o,t));var h=l(require("express"),1),f=require("http"),i=l(require("path"),1),r=l(require("fs"),1),p=(0,h.default)(),_=(0,f.createServer)(p),d=[i.default.join(__dirname,"public"),i.default.resolve(process.cwd(),"dist","public"),i.default.resolve(process.cwd(),"public"),i.default.join(__dirname,"..","dist","public"),"/home/runner/workspace/dist/public"],n="",s="";for(let t of d){let e=i.default.join(t,"index.html");if(console.log(`[prod] Checking path: ${t}`),r.default.existsSync(e)){n=t,s=e,console.log(`[prod] Found index.html at: ${e}`);break}}n||(console.error("[prod] ERROR: Could not find public folder!"),console.error("[prod] __dirname:",__dirname),console.error("[prod] process.cwd():",process.cwd()),console.error("[prod] Tried paths:",d));var g=!1;p.get("/health",(t,e)=>{e.status(200).send("OK")});p.get("/__healthcheck",(t,e)=>{e.status(200).send("OK")});p.get("/__debug",(t,e)=>{e.json({__dirname,cwd:process.cwd(),publicPath:n,indexPath:s,exists:r.default.existsSync(s),triedPaths:d.map(o=>({path:o,exists:r.default.existsSync(o),hasIndex:r.default.existsSync(i.default.join(o,"index.html"))}))})});n&&p.use(h.default.static(n));p.get("*",(t,e,o)=>{if(t.path.startsWith("/api"))return g?o():e.status(503).json({error:"Server starting..."});s&&r.default.existsSync(s)?e.sendFile(s):e.status(500).send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Error</title></head>
<body>
  <h1>Static files not found</h1>
  <p>__dirname: ${__dirname}</p>
  <p>cwd: ${process.cwd()}</p>
  <p>publicPath: ${n||"not found"}</p>
  <p>indexPath: ${s||"not found"}</p>
  <p>Tried paths:</p>
  <ul>
    ${d.map(a=>`<li>${a} - ${r.default.existsSync(a)?"exists":"missing"}</li>`).join("")}
  </ul>
</body>
</html>
    `)});var u=parseInt(process.env.PORT||"5000",10);_.listen(u,"0.0.0.0",()=>{console.log(`[prod] Server listening on port ${u}`),console.log(`[prod] Serving static from: ${n||"NOT FOUND"}`),v()});async function v(){try{console.log("[prod] Starting app initialization...");let t=Date.now(),{initializeApp:e}=await import("./app-init.cjs");await e(_,p),g=!0;let o=Date.now()-t;console.log(`[prod] App fully initialized in ${o}ms`)}catch(t){console.error("[prod] Failed to initialize app:",t)}}

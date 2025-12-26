"use strict";var m=Object.create;var o=Object.defineProperty;var g=Object.getOwnPropertyDescriptor;var f=Object.getOwnPropertyNames;var y=Object.getPrototypeOf,u=Object.prototype.hasOwnProperty;var v=(e,t,i,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of f(t))!u.call(e,r)&&r!==i&&o(e,r,{get:()=>t[r],enumerable:!(n=g(t,r))||n.enumerable});return e};var s=(e,t,i)=>(i=e!=null?m(y(e)):{},v(t||!e||!e.__esModule?o(i,"default",{value:e,enumerable:!0}):i,e));var c=s(require("express"),1),h=require("http"),a=(0,c.default)(),l=(0,h.createServer)(a),d=!1;a.get("/health",(e,t)=>{t.status(200).send("OK")});a.get("/__healthcheck",(e,t)=>{t.status(200).send("OK")});a.get("/",(e,t,i)=>{if(d)return i();t.status(200).send(`<!DOCTYPE html>
<html>
<head><title>Loading...</title><meta http-equiv="refresh" content="2"></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1e1b4b;color:white;">
<div style="text-align:center">
<h1>\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F...</h1>
<p>\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 2 \u0441\u0435\u043A\u0443\u043D\u0434\u044B</p>
</div>
</body>
</html>`)});var p=parseInt(process.env.PORT||"5000",10);l.listen(p,"0.0.0.0",()=>{console.log(`[prod] Server listening on port ${p}, health checks ready`),setImmediate(async()=>{try{let{initializeApp:e}=await import("./app-init.cjs");await e(l,a),d=!0,console.log("[prod] Full application initialized")}catch(e){console.error("[prod] Failed to initialize app:",e)}})});

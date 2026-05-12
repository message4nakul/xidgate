'use client';
import { useState, useEffect, useRef, useMemo } from "react";

/* ═══ HELPERS ═══ */
const genXID = () => { const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let r=""; for(let i=0;i<7;i++) r+=c[Math.floor(Math.random()*c.length)]; return `XID-${r}`; };
const timeAgo = d => { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60) return "now"; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const timeFull = d => { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)} min ago`; if(s<86400) return `${Math.floor(s/3600)} hours ago`; return `${Math.floor(s/86400)} days ago`; };
const fmtLeft = e => { if(!e) return "No expiry"; const d=new Date(e).getTime()-Date.now(); if(d<=0) return "Expired"; const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000); if(h>24) return `${Math.floor(h/24)}d ${h%24}h`; if(h>0) return `${h}h ${m}m`; return `${m}m`; };
const getExp = dur => { if(dur==="never") return null; const m={"1h":36e5,"6h":216e5,"24h":864e5,"7d":6048e5,"30d":25920e5}; return new Date(Date.now()+(m[dur]||864e5)).toISOString(); };
const lastMsg = x => { let latest=null; x.conversations.forEach(c=>c.messages.forEach(m=>{if(!latest||new Date(m.ts)>new Date(latest.ts)) latest=m;})); return latest; };

const ahOpts = [{label:"Any time",value:"any"},{label:"Morning · 6 AM–12 PM",value:"6am-12pm"},{label:"Afternoon · 12–6 PM",value:"12pm-6pm"},{label:"Evening · 6–11 PM",value:"6pm-11pm"},{label:"Business · 9 AM–6 PM",value:"9am-6pm"},{label:"After work · 6–10 PM",value:"6pm-10pm"},{label:"Daytime · 8 AM–8 PM",value:"8am-8pm"},{label:"Night · 8 PM–2 AM",value:"8pm-2am"}];
const getAH = v => ahOpts.find(o=>o.value===v)?.label||v;
const durOpts = [{label:"1 hour",value:"1h"},{label:"6 hours",value:"6h"},{label:"24 hours",value:"24h"},{label:"7 days",value:"7d"},{label:"30 days",value:"30d"},{label:"No expiry",value:"never"}];

/* ═══ ICONS ═══ */
const I={
  Plus:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Clock:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Send:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Copy:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Chat:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Trash:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Back:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Lock:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Globe:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Users:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  User:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Chev:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Search:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  XH:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
  Power:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
  Link:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Check:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Share:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Settings:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Zap:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Shield:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

/* ═══ SAMPLE DATA ═══ */
const samples = [
  {id:"1",xid:"XID-Xt7mK2q",label:"Standing Desk — OLX",context:"custom",status:"active",xidType:"individual",duration:"24h",activeHours:"9am-6pm",maxConn:1,maxMsgs:50,createdAt:new Date(Date.now()-72e5).toISOString(),expiresAt:new Date(Date.now()+612e5).toISOString(),
    conversations:[{id:"c1",entity:"Interested Buyer",messages:[
      {id:1,from:"them",sender:"Interested Buyer",text:"Hey, is the desk still available?",ts:new Date(Date.now()-54e5).toISOString()},
      {id:2,from:"me",text:"Yes! Walnut top, great condition. Used for 6 months.",ts:new Date(Date.now()-51e5).toISOString()},
      {id:3,from:"them",sender:"Interested Buyer",text:"Nice. Can you do ₹8,500?",ts:new Date(Date.now()-36e5).toISOString()},
      {id:4,from:"me",text:"₹9,500 and it's yours. Can deliver today.",ts:new Date(Date.now()-3e5).toISOString()},
    ]}]},
  {id:"2",xid:"XID-Rn4pW8j",label:"Plumber Quotes — Kitchen Sink",context:"custom",status:"active",xidType:"individual",duration:"7d",activeHours:"9am-6pm",maxConn:3,maxMsgs:null,createdAt:new Date(Date.now()-1728e5).toISOString(),expiresAt:new Date(Date.now()+432e6).toISOString(),
    conversations:[
      {id:"c2a",entity:"RK Plumbing",messages:[{id:1,from:"them",sender:"RK Plumbing",text:"Checked the photos. Standard repipe. ₹18,000 all-inclusive.",ts:new Date(Date.now()-864e5).toISOString()},{id:2,from:"me",text:"Thanks. Comparing with others, will revert.",ts:new Date(Date.now()-792e5).toISOString()}]},
      {id:"c2b",entity:"AquaFix Services",messages:[{id:1,from:"them",sender:"AquaFix Services",text:"Can do ₹15,500 with CPVC. Includes 1-year warranty.",ts:new Date(Date.now()-432e5).toISOString()},{id:2,from:"me",text:"Sounds good. Available this Thursday?",ts:new Date(Date.now()-36e5).toISOString()},{id:3,from:"them",sender:"AquaFix Services",text:"Thursday 10 AM works. Will bring all material.",ts:new Date(Date.now()-18e5).toISOString()}]},
    ]},
  {id:"4",xid:"XID-Gp8nQ4w",label:"Weekend Trek Group",context:"custom",status:"active",xidType:"group",duration:"never",activeHours:"any",maxConn:null,maxMsgs:null,createdAt:new Date(Date.now()-6048e5).toISOString(),expiresAt:null,
    conversations:[{id:"c4",entity:null,messages:[
      {id:1,from:"them",sender:"Arjun",text:"This Saturday? Skandagiri sunrise trek?",ts:new Date(Date.now()-1728e5).toISOString()},
      {id:2,from:"them",sender:"Priya",text:"I'm in! What time do we leave?",ts:new Date(Date.now()-864e5).toISOString()},
      {id:3,from:"me",text:"2 AM from Indiranagar. I'll drive, 3 seats free.",ts:new Date(Date.now()-432e5).toISOString()},
      {id:4,from:"them",sender:"Rahul",text:"Count me in. Will bring breakfast for everyone 🙌",ts:new Date(Date.now()-216e5).toISOString()},
    ]}]},
  {id:"3",xid:"XID-Jw5tN3x",label:"Notion Trial Signup",context:"custom",status:"expired",xidType:"individual",duration:"1h",activeHours:"any",maxConn:1,maxMsgs:10,createdAt:new Date(Date.now()-6048e5).toISOString(),expiresAt:new Date(Date.now()-6012e5).toISOString(),
    conversations:[{id:"c3",entity:"Notion Sales",messages:[{id:1,from:"them",sender:"Notion Sales",text:"Welcome to Notion! Need any help getting started?",ts:new Date(Date.now()-604e6).toISOString()},{id:2,from:"me",text:"Just exploring. Will reach out if needed.",ts:new Date(Date.now()-6035e5).toISOString()}]}]},
];

/* ═══ SELECT ═══ */
function Sel({options,value,onChange}){
  const[open,setOpen]=useState(false);const ref=useRef(null);const sel=options.find(o=>o.value===value);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return(<div ref={ref} style={{position:"relative"}}><button style={S.selTr} onClick={()=>setOpen(!open)}><span style={{flex:1,color:"#c8cdd5"}}>{sel?.label}</span><span style={{color:"#4a5568",display:"flex",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}><I.Chev/></span></button>
    {open&&<div style={S.selDr}>{options.map(o=><button key={String(o.value)} style={{...S.selOp,background:o.value===value?"rgba(99,179,237,0.08)":"transparent",color:o.value===value?"#63b3ed":"#9aa3b0"}} onClick={()=>{onChange(o.value);setOpen(false);}} onMouseEnter={e=>{if(o.value!==value)e.currentTarget.style.background="rgba(255,255,255,0.03)";}} onMouseLeave={e=>{if(o.value!==value)e.currentTarget.style.background="transparent";}}>{o.label}</button>)}</div>}
  </div>);
}

/* search */
const xidMatch=(x,q)=>{if(!q)return true;const l=q.toLowerCase();return x.label.toLowerCase().includes(l)||x.xid.toLowerCase().includes(l)||x.conversations.some(c=>(c.entity&&c.entity.toLowerCase().includes(l))||c.messages.some(m=>m.text.toLowerCase().includes(l)));};
const cvMatch=(c,q)=>{if(!q)return true;const l=q.toLowerCase();return(c.entity&&c.entity.toLowerCase().includes(l))||c.messages.some(m=>m.text.toLowerCase().includes(l));};

/* ═══ TOAST ═══ */
function Toast({message,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return <div style={S.toast}><I.Check/> {message}</div>;
}

/* ═══ AUTH ═══ */
function AuthScreen({onLogin}){
  const[mode,setMode]=useState("login");const[email,setEmail]=useState("");const[pass,setPass]=useState("");const[name,setName]=useState("");
  const go=()=>{if(!email||!pass)return;onLogin({email,name:name||email.split("@")[0]});};
  return(<div style={S.authBg}>
    <div style={S.authCard}>
      <div style={S.authLogo}><div style={S.logoI}><I.XH/></div><span style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-0.04em"}}>XIDgate</span></div>
      <p style={S.authTag}>You control the conversation</p>
      <div style={S.authDivider}/>
      <h2 style={S.authTitle}>{mode==="login"?"Sign in to your account":"Create your account"}</h2>
      {mode==="signup"&&<div style={S.authField}><label style={S.fLabel}>Full Name</label><input style={S.inp} placeholder="Nakul Ramachandran" value={name} onChange={e=>setName(e.target.value)}/></div>}
      <div style={S.authField}><label style={S.fLabel}>Email Address</label><input style={S.inp} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      <div style={S.authField}><label style={S.fLabel}>Password</label><input style={S.inp} type="password" placeholder="Min 8 characters" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      <button style={{...S.primaryBtn,width:"100%",marginTop:4,opacity:(email&&pass)?1:0.4}} onClick={go}>{mode==="login"?"Sign In":"Create Account"}</button>
      <p style={S.authSwitch}>{mode==="login"?"New to XIDgate?":"Already have an account?"}{" "}<button style={S.authLink} onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create account":"Sign in"}</button></p>
    </div>
  </div>);
}

/* ═══ PRICING ═══ */
function PricingScreen({onClose}){
  return(<div style={S.ov} onClick={onClose}><div style={S.pricingWrap} onClick={e=>e.stopPropagation()}>
    <button style={S.closeX} onClick={onClose}>×</button>
    <div style={{textAlign:"center",marginBottom:28}}><h2 style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:4}}>Go Unlimited</h2><p style={{fontSize:13,color:"#5a6577"}}>Remove the 3 XID limit. Full power.</p></div>
    <div style={{display:"flex",gap:14}}>
      <div style={S.planFree}>
        <div style={{fontSize:11,fontWeight:700,color:"#5a6577",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Free</div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff"}}>₹0</div>
        <div style={{fontSize:11,color:"#4a5568",marginBottom:20}}>forever</div>
        {["3 active XIDs","Individual & Group","Text messaging","Kill switch","Active hours control"].map((f,i)=><div key={i} style={S.planFeat}><I.Check/>{f}</div>)}
        <div style={S.planCurrent}>Current Plan</div>
      </div>
      <div style={S.planPro}>
        <div style={S.proBadge}>POPULAR</div>
        <div style={{fontSize:11,fontWeight:700,color:"#63b3ed",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Pro</div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff"}}>₹199<span style={{fontSize:13,fontWeight:400,color:"#5a6577"}}>/mo</span></div>
        <div style={{fontSize:11,color:"#4a5568",marginBottom:20}}>billed monthly</div>
        {["Unlimited active XIDs","Everything in Free","Priority support","Connection analytics","Custom branding (soon)","API access (soon)"].map((f,i)=><div key={i} style={S.planFeat}><I.Check/>{f}</div>)}
        <button style={{...S.primaryBtn,width:"100%",marginTop:16}} onClick={()=>alert("→ Razorpay checkout\n₹199/month\n\nIntegrate: razorpay.com → Subscriptions → Create Plan → Embed checkout")}>Upgrade · ₹199/mo</button>
        <div style={{fontSize:9,color:"#3d4555",marginTop:8,textAlign:"center"}}>Powered by Razorpay · Cancel anytime</div>
      </div>
    </div>
  </div></div>);
}

/* ═══ ACCEPT MODAL ═══ */
function AcceptModal({onClose,onAccept}){
  const[code,setCode]=useState("");
  return(<div style={S.ov} onClick={onClose}><div style={S.acceptWrap} onClick={e=>e.stopPropagation()}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(168,130,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#a882ff"}}><I.Link/></div><h3 style={{fontSize:16,fontWeight:700,color:"#fff"}}>Accept an XID</h3></div>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Paste the code someone shared with you to connect.</p>
    <input style={{...S.inp,textAlign:"center",fontSize:16,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.08em",padding:"14px 16px",border:"1px solid rgba(168,130,255,0.25)",background:"rgba(168,130,255,0.04)"}} placeholder="XID-XXXXXXX" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&code.trim()&&(onAccept(code.trim()),setCode(""))}/>
    <div style={{display:"flex",gap:8,marginTop:14}}>
      <button style={S.secBtn} onClick={onClose}>Cancel</button>
      <button style={{...S.primaryBtn,flex:1,background:"#a882ff",opacity:code.trim()?1:0.35}} onClick={()=>{if(code.trim()){onAccept(code.trim());setCode("");}}}><I.Link/> Connect</button>
    </div>
  </div></div>);
}

/* ═══ SHARE MODAL ═══ */
function ShareModal({xid,onClose,onCopy}){
  const url = `xidgate.com/x/${xid.xid}`;
  return(<div style={S.ov} onClick={onClose}><div style={S.shareWrap} onClick={e=>e.stopPropagation()}>
    <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:4}}>Share this XID</h3>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Send this code or link. They'll connect without seeing your identity.</p>
    <div style={S.shareCode}><code style={{fontSize:20,fontWeight:700,color:"#63b3ed",letterSpacing:"0.06em"}}>{xid.xid}</code><button style={S.copySmall} onClick={()=>onCopy(xid.xid)}><I.Copy/> Copy</button></div>
    <div style={{fontSize:11,color:"#3d4555",textAlign:"center",margin:"12px 0 4px"}}>or share the link</div>
    <div style={S.shareLink}><span style={{fontSize:12,color:"#8891a0",flex:1}}>{url}</span><button style={S.copySmall} onClick={()=>onCopy(url)}><I.Copy/> Copy</button></div>
    <div style={{display:"flex",gap:8,marginTop:16}}>
      <button style={{...S.secBtn,flex:1}} onClick={onClose}>Done</button>
    </div>
  </div></div>);
}

/* ═══ MAIN APP ═══ */
export default function App(){
  const[user,setUser]=useState(null);
  const[xids,setXids]=useState(samples);
  const[view,setView]=useState("dashboard");
  const[actXid,setActXid]=useState(null);
  const[actConvo,setActConvo]=useState(null);
  const[showKill,setShowKill]=useState(null);
  const[showAccept,setShowAccept]=useState(false);
  const[showPricing,setShowPricing]=useState(false);
  const[showShare,setShowShare]=useState(null);
  const[toast,setToast]=useState(null);
  const[copied,setCopied]=useState(null);
  const[mounted,setMounted]=useState(false);
  const[sideQ,setSideQ]=useState("");

  useEffect(()=>{setMounted(true);},[]);
  useEffect(()=>{const iv=setInterval(()=>{setXids(p=>p.map(x=>x.status==="active"&&x.expiresAt&&new Date(x.expiresAt)<=new Date()?{...x,status:"expired"}:x));},1e4);return()=>clearInterval(iv);},[]);

  if(!user) return <AuthScreen onLogin={setUser}/>;

  const activeL=xids.filter(x=>x.status==="active");
  const closedL=xids.filter(x=>x.status!=="active");
  const filt=list=>sideQ.trim()?list.filter(x=>xidMatch(x,sideQ)):list;
  const totM=x=>x.conversations.reduce((s,c)=>s+c.messages.length,0);
  const canCreate=activeL.length<3;

  const create=d=>{
    const mc=d.maxConn===""?null:(parseInt(d.maxConn)||null);
    const mm=d.maxMsgs===""?null:(parseInt(d.maxMsgs)||null);
    const newX={id:String(Date.now()),xid:genXID(),label:d.label,context:"custom",xidType:d.xidType,duration:d.duration,activeHours:d.activeHours,maxConn:mc,maxMsgs:mm,status:"active",createdAt:new Date().toISOString(),expiresAt:getExp(d.duration),conversations:[]};
    setXids(p=>[newX,...p]);
    setView("dashboard");
    setToast("XID created! Share it to start connecting.");
    setTimeout(()=>setShowShare(newX),400);
  };
  const kill=id=>{setXids(p=>p.map(x=>x.id===id?{...x,status:"revoked"}:x));setShowKill(null);setToast("XID killed. All conversations destroyed.");if(actXid?.id===id){setView("dashboard");setActConvo(null);}};
  const send=(xid,cid,txt)=>{setXids(p=>p.map(x=>x.id!==xid?x:{...x,conversations:x.conversations.map(c=>c.id===cid?{...c,messages:[...c.messages,{id:Date.now(),from:"me",text:txt,ts:new Date().toISOString()}]}:c)}));};
  const cp=v=>{navigator.clipboard?.writeText(v);setCopied(v);setToast("Copied to clipboard!");setTimeout(()=>setCopied(null),2e3);};
  const openX=(x,c)=>{setActXid(x);setActConvo(x.xidType==="group"?(x.conversations[0]||null):(c||x.conversations[0]||null));setView("chat");};
  const acceptXID=code=>{const f=xids.find(x=>x.xid===code&&x.status==="active");if(f){openX(f);setShowAccept(false);setToast("Connected!");}else{alert(`XID "${code}" not found or inactive.`);setShowAccept(false);}};

  return(<div style={S.root}><style>{CSS}</style>
    {/* SIDEBAR */}
    <nav style={S.side}>
      <div style={S.logoW}><div style={S.logoI}><I.XH/></div><div><div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.04em"}}>XIDgate</div><div style={{fontSize:8.5,color:"#3d4555",letterSpacing:"0.04em",marginTop:1}}>YOU CONTROL THE CONVERSATION</div></div></div>

      <div style={{padding:"4px 12px 8px",display:"flex",gap:6}}>
        <button style={S.sideNewBtn} onClick={()=>canCreate?setView("create"):setShowPricing(true)} onMouseEnter={e=>{e.currentTarget.style.background="#63b3ed";e.currentTarget.style.color="#0a1628";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(99,179,237,0.08)";e.currentTarget.style.color="#63b3ed";}}><I.Plus/> New</button>
        <button style={S.sideAccBtn} onClick={()=>setShowAccept(true)} onMouseEnter={e=>e.currentTarget.style.background="rgba(168,130,255,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(168,130,255,0.05)"}><I.Link/> Accept</button>
      </div>

      <div style={{padding:"0 12px 8px"}}><div style={S.searchB}><I.Search/><input style={S.searchInp} placeholder="Search..." value={sideQ} onChange={e=>setSideQ(e.target.value)}/>{sideQ&&<button style={{color:"#4a5568",fontSize:14,lineHeight:1}} onClick={()=>setSideQ("")}>×</button>}</div></div>

      <div style={S.navB}>
        <div style={S.navLabel}>ACTIVE · {activeL.length}/{canCreate?3:"∞"}</div>
        {filt(activeL).length===0&&<div style={S.navEmpty}>{sideQ?"No matches":"Create your first XID"}</div>}
        {filt(activeL).map(x=>{const lm=lastMsg(x);return(
          <button key={x.id} style={{...S.navItem,background:actXid?.id===x.id&&view==="chat"?"rgba(99,179,237,0.06)":"transparent",borderLeft:actXid?.id===x.id&&view==="chat"?"2px solid #63b3ed":"2px solid transparent"}} onClick={()=>openX(x)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:x.xidType==="group"?"#a882ff":"#4a5568",display:"flex"}}>{x.xidType==="group"?<I.Users/>:<I.User/>}</span><span style={{fontSize:12,fontWeight:600,color:"#c8cdd5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</span></div>
              {lm&&<div style={{fontSize:10.5,color:"#3d4555",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lm.from==="me"?"You: ":""}{lm.text}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
              <span style={{fontSize:9,color:"#3d4555",fontFamily:"'IBM Plex Mono',monospace"}}>{lm?timeAgo(lm.ts):""}</span>
              <span style={{fontSize:8,color:"#4a5568"}}>{fmtLeft(x.expiresAt)}</span>
            </div>
          </button>
        );})}
      </div>

      <div style={S.navB}>
        <div style={S.navLabel}>CLOSED</div>
        {filt(closedL).length===0&&<div style={S.navEmpty}>{sideQ?"No matches":"—"}</div>}
        {filt(closedL).map(x=><button key={x.id} style={{...S.navItem,opacity:0.4}} onClick={()=>openX(x)}>
          <div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:"#3d4555",display:"flex"}}>{x.xidType==="group"?<I.Users/>:<I.User/>}</span><span style={{fontSize:12,fontWeight:500,color:"#5a6577",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</span></div></div>
          <span style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:"rgba(255,255,255,0.04)",color:"#3d4555",textTransform:"uppercase",fontWeight:600}}>{x.status}</span>
        </button>)}
      </div>

      <div style={S.sideFoot}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:24,height:24,borderRadius:6,background:"rgba(99,179,237,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#63b3ed",fontSize:11,fontWeight:700}}>{user.name[0].toUpperCase()}</div><span style={{fontSize:11.5,fontWeight:600,color:"#8891a0"}}>{user.name}</span></div>
          <button style={S.upgradeBtn} onClick={()=>setShowPricing(true)}><I.Zap/> Pro</button>
        </div>
      </div>
    </nav>

    {/* MAIN */}
    <main style={S.main}>
      {view==="dashboard"&&<Dash xids={xids} onCreate={()=>canCreate?setView("create"):setShowPricing(true)} onOpen={openX} onCp={cp} copied={copied} onKill={id=>setShowKill(id)} onShare={x=>setShowShare(x)} mt={mounted} tm={totM} onAccept={()=>setShowAccept(true)} canCreate={canCreate}/>}
      {view==="create"&&<CreateXID onSubmit={create} onCancel={()=>setView("dashboard")}/>}
      {view==="chat"&&actXid&&<ChatV xid={xids.find(x=>x.id===actXid.id)||actXid} convo={actConvo} onSelConvo={setActConvo} onBack={()=>{setView("dashboard");setActXid(null);setActConvo(null);}} onSend={(cid,t)=>send(actXid.id,cid,t)} onKill={()=>setShowKill(actXid.id)} onCp={cp} copied={copied} onShare={()=>setShowShare(xids.find(x=>x.id===actXid.id))}/>}
    </main>

    {/* MODALS */}
    {showKill&&<div style={S.ov} onClick={()=>setShowKill(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={{width:44,height:44,borderRadius:12,background:"rgba(232,93,93,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#e85d5d",margin:"0 auto 12px"}}><I.Power/></div><h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>Kill this XID?</h3><p style={{fontSize:12,color:"#5a6577",lineHeight:1.6,marginBottom:20}}>Everyone loses access immediately. All messages are permanently destroyed. This cannot be undone.</p><div style={{display:"flex",gap:8}}><button style={S.secBtn} onClick={()=>setShowKill(null)}>Cancel</button><button style={{...S.primaryBtn,flex:1,background:"#e85d5d"}} onClick={()=>kill(showKill)}>Kill XID</button></div></div></div>}
    {showAccept&&<AcceptModal onClose={()=>setShowAccept(false)} onAccept={acceptXID}/>}
    {showPricing&&<PricingScreen onClose={()=>setShowPricing(false)}/>}
    {showShare&&<ShareModal xid={showShare} onClose={()=>setShowShare(null)} onCopy={cp}/>}
    {toast&&<Toast message={toast} onDone={()=>setToast(null)}/>}
  </div>);
}

/* ═══ DASHBOARD ═══ */
function Dash({xids,onCreate,onOpen,onCp,copied,onKill,onShare,mt,tm,onAccept,canCreate}){
  return(<div style={S.dashW}>
    <div style={S.dashHead}>
      <div><h1 style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>Dashboard</h1><p style={{fontSize:12.5,color:"#4a5568",marginTop:2}}>Manage your active and closed XIDs</p></div>
      <div style={{display:"flex",gap:6}}>
        <button style={S.dashAccBtn} onClick={onAccept}><I.Link/> Accept</button>
        <button style={S.dashNewBtn} onClick={onCreate} onMouseEnter={e=>{e.currentTarget.style.background="#63b3ed";e.currentTarget.style.color="#0a1628";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(99,179,237,0.08)";e.currentTarget.style.color="#63b3ed";}}><I.Plus/> New XID{!canCreate?" (Pro)":""}</button>
      </div>
    </div>
    {xids.length===0?<div style={S.emptyState}>
      <div style={S.emptyIcon}><I.Shield/></div>
      <h3 style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:6}}>Your conversations, your rules</h3>
      <p style={{fontSize:13,color:"#4a5568",maxWidth:380,lineHeight:1.6,marginBottom:20}}>Create an XID to start a conversation without sharing your phone number, email, or any personal info. Set time limits, connection caps, and kill it whenever you want.</p>
      <div style={{display:"flex",gap:8}}>
        <button style={S.primaryBtn} onClick={onCreate}><I.Plus/> Create your first XID</button>
        <button style={S.ghostBtn} onClick={onAccept}><I.Link/> Accept an XID</button>
      </div>
    </div>
    :<div style={S.grid}>{xids.map((x,i)=><Card key={x.id} x={x} i={i} onOpen={c=>onOpen(x,c)} onCp={()=>onCp(x.xid)} copied={copied===x.xid} onKill={()=>onKill(x.id)} onShare={()=>onShare(x)} mt={mt} tm={tm(x)}/>)}</div>}
  </div>);
}

/* ═══ CARD ═══ */
function Card({x,i:idx,onOpen,onCp,copied,onKill,onShare,mt,tm}){
  const act=x.status==="active",isG=x.xidType==="group";
  const prg=act&&x.expiresAt?Math.max(0,Math.min(1,(new Date(x.expiresAt)-Date.now())/(new Date(x.expiresAt)-new Date(x.createdAt)))):0;
  const lm=lastMsg(x);
  return(<div style={{...S.card,opacity:mt?1:0,transform:mt?"translateY(0)":"translateY(12px)",transition:`all 0.4s cubic-bezier(0.16,1,0.3,1) ${idx*0.05}s`,borderColor:act?"rgba(99,179,237,0.1)":"rgba(255,255,255,0.03)"}}>
    {act&&x.expiresAt&&<div style={S.progTrack}><div style={{...S.progBar,width:`${prg*100}%`}}/></div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,display:"flex",alignItems:"center",gap:3,background:isG?"rgba(168,130,255,0.1)":"rgba(99,179,237,0.08)",color:isG?"#a882ff":"#63b3ed"}}>{isG?<><I.Users/> GRP</>:<><I.User/> 1:1</>}</span>
          <span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:act?"rgba(72,187,120,0.1)":"rgba(255,255,255,0.04)",color:act?"#48bb78":x.status==="revoked"?"#e85d5d":"#4a5568"}}>{act?"Live":x.status}</span>
        </div>
        <h3 style={{fontSize:14,fontWeight:700,color:"#e2e8f0",lineHeight:1.3}}>{x.label}</h3>
      </div>
      {act&&<button style={S.shareSmBtn} onClick={e=>{e.stopPropagation();onShare();}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(99,179,237,0.05)"}><I.Share/></button>}
    </div>

    <button style={S.xidCodeBtn} onClick={e=>{e.stopPropagation();onCp();}}><code>{x.xid}</code>{copied?<span style={{color:"#48bb78",fontSize:9}}>✓</span>:<I.Copy/>}</button>

    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
      <span style={S.metaTag}><I.Clock/>{fmtLeft(x.expiresAt)}</span>
      <span style={S.metaTag}>{isG?<I.Users/>:<I.User/>}{x.conversations.length}{x.maxConn!=null?`/${x.maxConn}`:""}</span>
      {x.maxMsgs!=null&&<span style={S.metaTag}><I.Chat/>{tm}/{x.maxMsgs}</span>}
    </div>

    {lm&&<div style={S.lastMsgPreview}><span style={{fontWeight:600,color:"#5a6577"}}>{lm.from==="me"?"You":lm.sender||""}:</span> {lm.text}</div>}

    {!isG&&x.conversations.length>1&&<div style={{marginBottom:8}}>{x.conversations.map(c=><button key={c.id} style={S.convoItem} onClick={()=>onOpen(c)} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontWeight:500,display:"flex",alignItems:"center",gap:4,color:"#8891a0"}}><I.User/>{c.entity}</span><span style={{fontSize:9,color:"#3d4555"}}>{c.messages.length} msgs</span></button>)}</div>}
    {isG&&x.conversations[0]?.messages.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{[...new Set(x.conversations[0].messages.filter(m=>m.sender).map(m=>m.sender))].map((n,i)=><span key={i} style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:"rgba(168,130,255,0.06)",color:"#8878b0"}}>{n}</span>)}</div>}

    <div style={{display:"flex",gap:6,marginTop:4}}>
      <button style={S.cardBtn} onClick={()=>onOpen(null)} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}><I.Chat/>{act?"Open":"View"}</button>
      {act&&<button style={S.cardKillBtn} onClick={e=>{e.stopPropagation();onKill();}} onMouseEnter={e=>e.currentTarget.style.background="rgba(232,93,93,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(232,93,93,0.05)"}><I.Trash/></button>}
    </div>
  </div>);
}

/* ═══ CREATE ═══ */
function CreateXID({onSubmit,onCancel}){
  const[label,setLabel]=useState("");
  const[xidType,setXT]=useState("individual");
  const[dur,setDur]=useState("24h");
  const[ah,setAH]=useState("any");
  const[mc,setMC]=useState("");
  const[mm,setMM]=useState("");
  const[pvXid]=useState(genXID());

  const go=()=>{if(!label.trim())return;onSubmit({label:label.trim(),xidType,duration:dur,activeHours:ah,maxConn:mc,maxMsgs:mm});};
  const valid=label.trim().length>0;

  return(<div style={{flex:1,overflowY:"auto",padding:"24px 32px"}}>
    <button style={S.backBtn} onClick={onCancel}><I.Back/> Dashboard</button>
    <div style={{maxWidth:540}}>
      <h2 style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>New XID</h2>
      <p style={{fontSize:12.5,color:"#4a5568",marginBottom:24}}>Set the rules. Share the code. You're in control.</p>

      <div style={S.formSection}>
        <label style={S.fLabel}>What's this for?</label>
        <input style={S.inp} placeholder='e.g. "OLX Sofa Buyer" or "Freelance Project"' value={label} onChange={e=>setLabel(e.target.value)} autoFocus/>
        {label.trim()&&<div style={{fontSize:10,color:"#48bb78",marginTop:4}}>✓ Looks good</div>}
      </div>

      <div style={S.formSection}>
        <label style={S.fLabel}>Type</label>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.typeBtn,borderColor:xidType==="individual"?"rgba(99,179,237,0.35)":"rgba(255,255,255,0.06)",background:xidType==="individual"?"rgba(99,179,237,0.06)":"transparent"}} onClick={()=>setXT("individual")}><div style={{color:xidType==="individual"?"#63b3ed":"#4a5568",marginBottom:4}}><I.User/></div><div style={{fontSize:12,fontWeight:600,color:xidType==="individual"?"#c8cdd5":"#5a6577"}}>Individual</div><div style={{fontSize:10,color:"#4a5568",marginTop:2}}>Separate chat per person</div></button>
          <button style={{...S.typeBtn,borderColor:xidType==="group"?"rgba(168,130,255,0.35)":"rgba(255,255,255,0.06)",background:xidType==="group"?"rgba(168,130,255,0.06)":"transparent"}} onClick={()=>setXT("group")}><div style={{color:xidType==="group"?"#a882ff":"#4a5568",marginBottom:4}}><I.Users/></div><div style={{fontSize:12,fontWeight:600,color:xidType==="group"?"#c8cdd5":"#5a6577"}}>Group</div><div style={{fontSize:10,color:"#4a5568",marginTop:2}}>Everyone in one chat</div></button>
        </div>
      </div>

      <div style={{display:"flex",gap:12,...S.formSection}}>
        <div style={{flex:1}}><label style={S.fLabel}>Expires After</label><Sel options={durOpts} value={dur} onChange={setDur}/></div>
        <div style={{flex:1}}><label style={S.fLabel}>Active Hours</label><Sel options={ahOpts} value={ah} onChange={setAH}/></div>
      </div>

      <div style={{display:"flex",gap:12,...S.formSection}}>
        <div style={{flex:1}}>
          <label style={S.fLabel}>Connection Limit</label>
          <div style={{display:"flex",gap:5,marginBottom:4}}>
            <button style={{...S.toggleBtn,background:mc===""?"rgba(99,179,237,0.1)":"transparent",color:mc===""?"#63b3ed":"#4a5568",borderColor:mc===""?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>setMC("")}>∞</button>
            <button style={{...S.toggleBtn,background:mc!==""?"rgba(99,179,237,0.1)":"transparent",color:mc!==""?"#63b3ed":"#4a5568",borderColor:mc!==""?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>{if(mc==="")setMC("1");}}>Limit</button>
          </div>
          {mc!==""&&<input style={S.inp} placeholder="Number" value={mc} onChange={e=>setMC(e.target.value.replace(/[^0-9]/g,""))}/>}
        </div>
        <div style={{flex:1}}>
          <label style={S.fLabel}>Max Messages</label>
          <div style={{display:"flex",gap:5,marginBottom:4}}>
            <button style={{...S.toggleBtn,background:mm===""?"rgba(99,179,237,0.1)":"transparent",color:mm===""?"#63b3ed":"#4a5568",borderColor:mm===""?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>setMM("")}>∞</button>
            <button style={{...S.toggleBtn,background:mm!==""?"rgba(99,179,237,0.1)":"transparent",color:mm!==""?"#63b3ed":"#4a5568",borderColor:mm!==""?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>{if(mm==="")setMM("50");}}>Limit</button>
          </div>
          {mm!==""&&<input style={S.inp} placeholder="Number" value={mm} onChange={e=>setMM(e.target.value.replace(/[^0-9]/g,""))}/>}
        </div>
      </div>

      {/* LIVE PREVIEW */}
      <div style={S.previewCard}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:24,height:24,borderRadius:6,background:"rgba(99,179,237,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#63b3ed"}}><I.Globe/></div><span style={{fontSize:10,fontWeight:700,color:"#63b3ed",textTransform:"uppercase",letterSpacing:"0.08em"}}>Live Preview</span></div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:700,color:"#63b3ed",marginBottom:6}}>{pvXid}</div>
        <div style={{fontSize:11,color:"#5a6577",lineHeight:1.6}}>{xidType==="group"?"Group":"1:1"} · {durOpts.find(d=>d.value===dur)?.label} · {getAH(ah)}{mc?` · ${mc} max`:""}{mm?` · ${mm} msgs`:""}</div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button style={S.secBtn} onClick={onCancel}>Cancel</button>
        <button style={{...S.primaryBtn,opacity:valid?1:0.35,pointerEvents:valid?"auto":"none"}} onClick={go}><I.Plus/> Create XID</button>
      </div>
    </div>
  </div>);
}

/* ═══ CHAT ═══ */
function ChatV({xid:x,convo,onSelConvo,onBack,onSend,onKill,onCp,copied,onShare}){
  const[input,setInput]=useState("");const[cvQ,setCvQ]=useState("");const endRef=useRef(null);
  const act=x.status==="active",isG=x.xidType==="group",cur=convo||x.conversations[0]||null;
  const totM=x.conversations.reduce((s,c)=>s+c.messages.length,0),atLim=x.maxMsgs!=null&&totM>=x.maxMsgs;
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[cur?.messages]);
  const doSend=()=>{if(!input.trim()||!act||atLim||!cur)return;onSend(cur.id,input.trim());setInput("");};
  const fCvs=useMemo(()=>cvQ.trim()?x.conversations.filter(c=>cvMatch(c,cvQ)):x.conversations,[x.conversations,cvQ]);

  return(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    {/* HEADER */}
    <div style={S.chatHeader}>
      <button style={{color:"#5a6577",padding:4,marginRight:4}} onClick={onBack}><I.Back/></button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</h3>
          <span style={{fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:3,flexShrink:0,background:isG?"rgba(168,130,255,0.1)":"rgba(99,179,237,0.08)",color:isG?"#a882ff":"#63b3ed"}}>{isG?"GRP":"1:1"}</span>
          <span style={{width:6,height:6,borderRadius:"50%",background:act?"#48bb78":"#e85d5d",flexShrink:0}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#3d4555",marginTop:2,flexWrap:"wrap"}}>
          <button style={S.xidMiniBtn} onClick={()=>onCp(x.xid)}>{x.xid}{copied===x.xid?" ✓":""}</button>
          <span>·</span><span>{fmtLeft(x.expiresAt)}</span>
          <span>·</span><span>{x.conversations.length}{x.maxConn!=null?`/${x.maxConn}`:""} connected</span>
          {x.maxMsgs!=null&&<><span>·</span><span style={{color:atLim?"#e85d5d":"inherit"}}>{totM}/{x.maxMsgs} msgs</span></>}
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexShrink:0}}>
        {act&&<button style={S.headerBtn} onClick={onShare} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><I.Share/></button>}
        {act&&<button style={{...S.headerBtn,color:"#e85d5d"}} onClick={onKill} onMouseEnter={e=>e.currentTarget.style.background="rgba(232,93,93,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Kill</button>}
      </div>
    </div>

    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* CONVO SIDEBAR */}
      {!isG&&x.conversations.length>1&&<div style={S.convoSidebar}>
        <div style={{padding:"8px 10px 4px",fontSize:9,fontWeight:700,color:"#2d3748",textTransform:"uppercase",letterSpacing:"0.1em"}}>Threads</div>
        <div style={{padding:"2px 8px 6px"}}><div style={S.searchB}><I.Search/><input style={{...S.searchInp,fontSize:10.5}} placeholder="Search..." value={cvQ} onChange={e=>setCvQ(e.target.value)}/>{cvQ&&<button style={{color:"#4a5568",fontSize:12}} onClick={()=>setCvQ("")}>×</button>}</div></div>
        {fCvs.map(c=><button key={c.id} style={{...S.convoSideItem,background:cur?.id===c.id?"rgba(99,179,237,0.06)":"transparent",borderLeft:cur?.id===c.id?"2px solid #63b3ed":"2px solid transparent"}} onClick={()=>onSelConvo(c)} onMouseEnter={e=>{if(cur?.id!==c.id)e.currentTarget.style.background="rgba(255,255,255,0.02)";}} onMouseLeave={e=>{if(cur?.id!==c.id)e.currentTarget.style.background="transparent";}}><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500,fontSize:11.5}}>{c.entity}</span><span style={{fontSize:9,color:"#3d4555",fontFamily:"'IBM Plex Mono',monospace"}}>{c.messages.length}</span></button>)}
      </div>}

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
          <div style={S.chatBanner}><I.Shield/><span>End-to-end protected. No personal info exchanged. {x.expiresAt?`Auto-expires ${fmtLeft(x.expiresAt)}.`:"No expiry set."}</span></div>
          {cur?cur.messages.map(m=><div key={m.id} style={{display:"flex",marginBottom:6,justifyContent:m.from==="me"?"flex-end":"flex-start"}}><div style={{maxWidth:"75%",padding:"8px 12px",borderRadius:m.from==="me"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:m.from==="me"?"rgba(99,179,237,0.1)":"rgba(255,255,255,0.04)",color:m.from==="me"?"#c8ddf0":"#b0b8c4"}}>{m.from!=="me"&&m.sender&&<div style={{fontSize:9,fontWeight:700,color:isG?"#a882ff":"#63b3ed",marginBottom:2}}>{m.sender}</div>}<div style={{fontSize:13,lineHeight:1.5}}>{m.text}</div><div style={{fontSize:8.5,color:"#2d3748",marginTop:3,textAlign:"right"}}>{timeFull(m.ts)}</div></div></div>):<div style={{textAlign:"center",padding:50,color:"#2d3748",fontSize:13}}>Share your XID code to start receiving messages.</div>}
          <div ref={endRef}/>
        </div>
        {act?(atLim?<div style={S.closedBar}><I.Chat/> Message limit reached.</div>:cur?<div style={S.inputBar}><input style={S.chatInput} placeholder={isG?"Message the group...":`Reply to ${cur.entity||""}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSend()}/>{x.maxMsgs!=null&&<span style={{fontSize:9,color:"#2d3748",fontFamily:"'IBM Plex Mono',monospace"}}>{totM}/{x.maxMsgs}</span>}<button style={{...S.sendBtn,opacity:input.trim()?1:0.2}} onClick={doSend}><I.Send/></button></div>:<div style={S.closedBar}><I.Globe/> Share your XID to start.</div>):<div style={S.closedBar}><I.Lock/> This XID is {x.status}.</div>}
      </div>
    </div>
  </div>);
}

/* ═══ CSS ═══ */
const CSS=`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05);border-radius:2px}input:focus{outline:none;border-color:rgba(99,179,237,0.3)!important}button{cursor:pointer;border:none;background:none;font-family:inherit}button:active{transform:scale(0.97)}::selection{background:rgba(99,179,237,0.25)}@keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;

/* ═══ STYLES ═══ */
const S={
root:{display:"flex",height:"100vh",background:"#090c11",color:"#c8cdd5",fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:"hidden"},
// Sidebar
side:{width:260,borderRight:"1px solid rgba(255,255,255,0.04)",display:"flex",flexDirection:"column",background:"#070a0f",flexShrink:0},
logoW:{display:"flex",alignItems:"center",gap:10,padding:"18px 14px 12px"},
logoI:{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#63b3ed,#3182ce)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"},
sideNewBtn:{flex:1,padding:"8px",borderRadius:8,background:"rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.15s",border:"1px solid rgba(99,179,237,0.15)"},
sideAccBtn:{flex:1,padding:"8px",borderRadius:8,background:"rgba(168,130,255,0.05)",color:"#a882ff",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.15s",border:"1px solid rgba(168,130,255,0.12)"},
searchB:{display:"flex",alignItems:"center",gap:6,padding:"6px 9px",borderRadius:7,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.04)",color:"#3d4555"},
searchInp:{flex:1,background:"transparent",border:"none",color:"#c8cdd5",fontSize:11.5,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"},
navB:{padding:"2px 0",flex:1,overflowY:"auto"},
navLabel:{fontSize:8.5,fontWeight:700,letterSpacing:"0.12em",color:"#2d3748",padding:"8px 14px 4px"},
navEmpty:{padding:"6px 14px",fontSize:10.5,color:"#1e2533",fontStyle:"italic"},
navItem:{width:"100%",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,transition:"all 0.12s",textAlign:"left"},
sideFoot:{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:10,color:"#2d3748"},
upgradeBtn:{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:5,background:"rgba(99,179,237,0.08)",color:"#63b3ed",border:"1px solid rgba(99,179,237,0.15)",display:"flex",alignItems:"center",gap:3},
// Main
main:{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"},
dashW:{flex:1,overflowY:"auto",padding:"24px 28px"},
dashHead:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,gap:16},
dashNewBtn:{padding:"8px 14px",borderRadius:8,background:"rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,transition:"all 0.15s",border:"1px solid rgba(99,179,237,0.15)"},
dashAccBtn:{padding:"8px 14px",borderRadius:8,border:"1px solid rgba(168,130,255,0.12)",color:"#a882ff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5},
// Empty
emptyState:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center",animation:"fadeUp 0.5s ease"},
emptyIcon:{width:52,height:52,borderRadius:14,background:"rgba(99,179,237,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:"#63b3ed",marginBottom:16},
// Grid
grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:10},
// Card
card:{background:"rgba(255,255,255,0.015)",border:"1px solid",borderRadius:12,padding:14,position:"relative",overflow:"hidden"},
progTrack:{position:"absolute",top:0,left:0,right:0,height:2,background:"rgba(255,255,255,0.02)"},
progBar:{height:"100%",background:"linear-gradient(90deg,#63b3ed,#3182ce)",borderRadius:"0 1px 1px 0"},
xidCodeBtn:{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 7px",borderRadius:4,background:"rgba(99,179,237,0.05)",border:"1px solid rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:10.5,cursor:"pointer",marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"},
metaTag:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,color:"#3d4555",padding:"2px 6px",borderRadius:3,background:"rgba(255,255,255,0.02)"},
lastMsgPreview:{fontSize:11,color:"#3d4555",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"4px 0"},
convoItem:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 6px",borderRadius:5,fontSize:11,transition:"all 0.1s",textAlign:"left",cursor:"pointer",background:"transparent"},
cardBtn:{flex:1,padding:"7px",borderRadius:7,background:"rgba(255,255,255,0.03)",color:"#8891a0",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.12s"},
cardKillBtn:{padding:"7px 9px",borderRadius:7,background:"rgba(232,93,93,0.05)",color:"#e85d5d",transition:"all 0.12s"},
shareSmBtn:{padding:6,borderRadius:6,background:"rgba(99,179,237,0.05)",color:"#63b3ed",transition:"all 0.12s"},
// Form
formSection:{marginBottom:18},
fLabel:{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#4a5568",marginBottom:6,display:"block"},
inp:{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",color:"#e2e8f0",fontSize:13.5,fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"border-color 0.15s",display:"block"},
typeBtn:{flex:1,padding:"14px 12px",borderRadius:10,border:"1px solid",textAlign:"center",transition:"all 0.15s",cursor:"pointer"},
toggleBtn:{flex:1,padding:"7px",borderRadius:7,border:"1px solid",fontSize:11.5,fontWeight:700,textAlign:"center",transition:"all 0.12s"},
previewCard:{borderRadius:10,border:"1px solid rgba(99,179,237,0.08)",background:"rgba(99,179,237,0.02)",padding:14,marginBottom:20},
backBtn:{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#4a5568",marginBottom:18,fontWeight:500},
// Buttons
primaryBtn:{padding:"10px 18px",borderRadius:9,background:"#63b3ed",color:"#0a1628",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.12s"},
secBtn:{flex:1,padding:"10px",borderRadius:9,background:"rgba(255,255,255,0.04)",color:"#8891a0",fontSize:12.5,fontWeight:600},
ghostBtn:{padding:"10px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",color:"#8891a0",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6},
// Select
selTr:{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"},
selDr:{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:"#111520",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:3,zIndex:50,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.5)"},
selOp:{width:"100%",padding:"7px 10px",borderRadius:5,fontSize:12,textAlign:"left",transition:"all 0.1s"},
// Chat
chatHeader:{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0},
xidMiniBtn:{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#4a5568",background:"rgba(99,179,237,0.04)",padding:"1px 5px",borderRadius:3,cursor:"pointer",border:"none"},
headerBtn:{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:600,color:"#8891a0",transition:"all 0.12s"},
convoSidebar:{width:180,borderRight:"1px solid rgba(255,255,255,0.04)",overflowY:"auto",flexShrink:0},
convoSideItem:{width:"100%",padding:"7px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#5a6577",textAlign:"left",cursor:"pointer",border:"none",background:"transparent",transition:"all 0.1s"},
chatBanner:{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:8,background:"rgba(99,179,237,0.025)",border:"1px solid rgba(99,179,237,0.05)",fontSize:10,color:"#3d4555",marginBottom:14,lineHeight:1.5},
inputBar:{display:"flex",gap:7,padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",alignItems:"center"},
chatInput:{flex:1,padding:"10px 12px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",color:"#e2e8f0",fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif"},
sendBtn:{width:38,height:38,borderRadius:9,background:"#63b3ed",color:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity 0.12s",flexShrink:0},
closedBar:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:11.5,color:"#2d3748"},
// Modals
ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
modal:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,maxWidth:380,width:"90%"},
closeX:{position:"absolute",top:14,right:14,fontSize:20,color:"#3d4555",lineHeight:1},
// Auth
authBg:{width:"100%",height:"100vh",background:"#070a0f",display:"flex",alignItems:"center",justifyContent:"center"},
authCard:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"36px 32px",width:380},
authLogo:{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6},
authTag:{fontSize:11,color:"#3d4555",textAlign:"center",marginBottom:16},
authDivider:{height:1,background:"rgba(255,255,255,0.04)",marginBottom:20},
authTitle:{fontSize:17,fontWeight:700,color:"#e2e8f0",marginBottom:20,textAlign:"center"},
authField:{marginBottom:14},
authSwitch:{fontSize:11.5,color:"#3d4555",marginTop:18,textAlign:"center"},
authLink:{color:"#63b3ed",fontWeight:600,fontSize:11.5,textDecoration:"none"},
// Pricing
pricingWrap:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"28px 24px",maxWidth:620,width:"95%",position:"relative"},
planFree:{flex:1,border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px 18px"},
planPro:{flex:1,border:"1px solid rgba(99,179,237,0.25)",borderRadius:12,padding:"20px 18px",background:"rgba(99,179,237,0.02)",position:"relative"},
proBadge:{position:"absolute",top:-9,right:14,background:"#63b3ed",color:"#0a1628",fontSize:8,fontWeight:800,padding:"3px 8px",borderRadius:4,letterSpacing:"0.06em"},
planFeat:{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#8891a0",marginBottom:7},
planCurrent:{width:"100%",padding:9,borderRadius:8,background:"rgba(255,255,255,0.03)",color:"#4a5568",fontSize:12,fontWeight:600,textAlign:"center",marginTop:16},
// Accept
acceptWrap:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,maxWidth:400,width:"90%"},
// Share
shareWrap:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,maxWidth:420,width:"90%"},
shareCode:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:9,background:"rgba(99,179,237,0.04)",border:"1px solid rgba(99,179,237,0.1)"},
shareLink:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:8,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.05)"},
copySmall:{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:5,background:"rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:10,fontWeight:600,flexShrink:0},
// Toast
toast:{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",color:"#63b3ed",padding:"10px 20px",borderRadius:10,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:7,zIndex:9999,animation:"toastIn 0.3s ease",boxShadow:"0 8px 30px rgba(0,0,0,0.4)"},
};
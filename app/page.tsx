'use client';
import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══ SUPABASE ═══ */
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/* ═══ HELPERS ═══ */
const genXID=()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";let r="";for(let i=0;i<7;i++)r+=c[Math.floor(Math.random()*c.length)];return`XID-${r}`;};
const timeAgo=d=>{if(!d)return"";const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;};
const timeFull=d=>{if(!d)return"";const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)} min ago`;if(s<86400)return`${Math.floor(s/3600)} hours ago`;return`${Math.floor(s/86400)} days ago`;};
const fmtLeft=e=>{if(!e)return"No expiry";const d=new Date(e).getTime()-Date.now();if(d<=0)return"Expired";const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);if(h>24)return`${Math.floor(h/24)}d ${h%24}h`;if(h>0)return`${h}h ${m}m`;return`${m}m`;};
const getExp=dur=>{if(dur==="never")return null;const m={"1h":36e5,"6h":216e5,"24h":864e5,"7d":6048e5,"30d":25920e5};return new Date(Date.now()+(m[dur]||864e5)).toISOString();};
const fmtDate=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:getUserTZ()}):"";
const fmtDateTime=d=>d?new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:getUserTZ()}):"";
const fmtTime=d=>d?new Date(d).toLocaleString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:getUserTZ()}):"";const xidMatch=(x,q)=>{if(!q)return true;const l=q.toLowerCase();return(x.label||"").toLowerCase().includes(l)||(x.xid||x.xid_code||"").toLowerCase().includes(l)||(x.conversations||[]).some(c=>(c.display_name&&c.display_name.toLowerCase().includes(l))||(c.messages||[]).some(m=>(m.text||"").toLowerCase().includes(l)));};
const cvMatch=(c,q)=>{if(!q)return true;const l=q.toLowerCase();return(c.display_name&&c.display_name.toLowerCase().includes(l))||(c.messages||[]).some(m=>(m.text||"").toLowerCase().includes(l));};

/* ═══ TIMEZONE HELPERS ═══ */
const getUserTZ=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){return"Asia/Kolkata";}};
const getHourInTZ=(tz)=>{try{const s=new Date().toLocaleString("en-US",{timeZone:tz,hour:"numeric",hour12:false});return parseInt(s);}catch(e){return new Date().getHours();}};
const checkActiveHours=(ah,tz)=>{
  if(!ah||ah==="any")return true;
  const hour=getHourInTZ(tz||getUserTZ());
  const ranges={"6am-12pm":[6,12],"12pm-6pm":[12,18],"6pm-11pm":[18,23],"9am-6pm":[9,18],"6pm-10pm":[18,22],"8am-8pm":[8,20],"8pm-2am":[20,26]};
  const range=ranges[ah];
  if(!range)return true;
  let h=hour;if(range[1]>24&&h<range[1]-24)h+=24;
  return h>=range[0]&&h<range[1];
};

const ahOpts=[{label:"Any time",value:"any"},{label:"Morning 6AM-12PM",value:"6am-12pm"},{label:"Afternoon 12-6PM",value:"12pm-6pm"},{label:"Evening 6-11PM",value:"6pm-11pm"},{label:"Business 9AM-6PM",value:"9am-6pm"},{label:"After work 6-10PM",value:"6pm-10pm"},{label:"Daytime 8AM-8PM",value:"8am-8pm"},{label:"Night 8PM-2AM",value:"8pm-2am"}];
const getAH=v=>ahOpts.find(o=>o.value===v)?.label||v;
const durOpts=[{label:"1 hour",value:"1h"},{label:"6 hours",value:"6h"},{label:"24 hours",value:"24h"},{label:"7 days",value:"7d"},{label:"30 days",value:"30d"},{label:"No expiry",value:"never"}];

/* ═══ EXPORT TO CSV ═══ */
const exportData=(xids,fromDate,toDate)=>{
  const rows=[["XID Code","Label","Type","Status","Created","Expires","Active Hours","Max Connections","Max Messages","Connection Name","Message From","Message Text","Message Time"]];
  xids.forEach(x=>{
    const xCode=x.xid||x.xid_code||"";
    (x.conversations||[]).forEach(c=>{
      const msgs=(c.messages||[]).filter(m=>{
        if(!fromDate&&!toDate)return true;
        const mt=new Date(m.ts);
        if(fromDate&&mt<new Date(fromDate))return false;
        if(toDate&&mt>new Date(toDate+"T23:59:59"))return false;
        return true;
      });
      if(msgs.length===0){
        rows.push([xCode,x.label||"",x.xidType||x.xid_type||"",x.status||"",fmtDate(x.created_at),fmtDate(x.expires_at),getAH(x.activeHours||x.active_hours||"any"),x.maxConn!=null?String(x.maxConn):"Unlimited",x.maxMsgs!=null?String(x.maxMsgs):"Unlimited",c.display_name||"","","",""]);
      }else{
        msgs.forEach(m=>{
          rows.push([xCode,x.label||"",x.xidType||x.xid_type||"",x.status||"",fmtDate(x.created_at),fmtDate(x.expires_at),getAH(x.activeHours||x.active_hours||"any"),x.maxConn!=null?String(x.maxConn):"Unlimited",x.maxMsgs!=null?String(x.maxMsgs):"Unlimited",c.display_name||"",m.from==="me"?"You":(m.sender||"Other"),m.text||"",fmtDateTime(m.ts)]);
        });
      }
    });
    if((x.conversations||[]).length===0){
      rows.push([xCode,x.label||"",x.xidType||x.xid_type||"",x.status||"",fmtDate(x.created_at),fmtDate(x.expires_at),getAH(x.activeHours||x.active_hours||"any"),x.maxConn!=null?String(x.maxConn):"Unlimited",x.maxMsgs!=null?String(x.maxMsgs):"Unlimited","","","",""]);
    }
  });
  const csv=rows.map(r=>r.map(c=>`"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`xidgate_export_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
};

/* ═══ ICONS ═══ */
const I={
  Plus:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Clock:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Send:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Copy:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Chat:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Trash:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Back:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Lock:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Globe:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  Users:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  User:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Chev:()=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Search:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Power:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
  Link:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Check:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Share:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Shield:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Logout:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Download:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

/* ═══ BRAND LOGO (text-based matching your image) ═══ */
const Logo=({size})=><span style={{fontSize:size||16,fontWeight:800,letterSpacing:"-0.04em",lineHeight:1}}><span style={{color:"#1B4F72"}}>XiD</span><span style={{color:"#E5A835"}}>gate</span></span>;

/* ═══ SMALL COMPONENTS ═══ */
function Sel({options,value,onChange}){
  const[open,setOpen]=useState(false);const ref=useRef(null);const sel=options.find(o=>o.value===value);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return(<div ref={ref} style={{position:"relative"}}><button style={S.selTr} onClick={()=>setOpen(!open)}><span style={{flex:1,color:"#c8cdd5"}}>{sel?.label}</span><span style={{color:"#4a5568",display:"flex",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}><I.Chev/></span></button>
    {open&&<div style={S.selDr}>{options.map(o=><button key={String(o.value)} style={{...S.selOp,background:o.value===value?"rgba(229,168,53,0.08)":"transparent",color:o.value===value?"#E5A835":"#9aa3b0"}} onClick={()=>{onChange(o.value);setOpen(false);}}>{o.label}</button>)}</div>}
  </div>);
}
function Toast({message,onDone}){useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);return<div style={S.toast}><I.Check/>{message}</div>;}
function SearchBox({value,onChange,placeholder,small}){
  return(<div style={{...S.searchB,...(small?{padding:"4px 7px"}:{})}}><I.Search/><input style={{...S.searchInp,...(small?{fontSize:10.5}:{})}} placeholder={placeholder||"Search..."} value={value} onChange={e=>onChange(e.target.value)}/>{value&&<button style={{color:"#4a5568",fontSize:small?12:14,lineHeight:1}} onClick={()=>onChange("")}>×</button>}</div>);
}

/* ═══ EXPORT MODAL ═══ */
function ExportModal({xids,onClose}){
  const[from,setFrom]=useState("");const[to,setTo]=useState("");
  return(<div style={S.ov} onClick={onClose}><div style={S.modalWide} onClick={e=>e.stopPropagation()}>
    <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:4,display:"flex",alignItems:"center",gap:8}}><I.Download/> Export Data</h3>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Download all XID data, connections, and messages as a CSV file. Open it in Excel for analysis.</p>
    <div style={{display:"flex",gap:10,marginBottom:16}}>
      <div style={{flex:1}}><label style={S.fLabel}>From Date (optional)</label><input style={S.inp} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
      <div style={{flex:1}}><label style={S.fLabel}>To Date (optional)</label><input style={S.inp} type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
    </div>
    <p style={{fontSize:10,color:"#3d4555",marginBottom:16}}>Leave dates empty to export all data. The CSV includes: XID codes, labels, types, status, connections, all messages with timestamps.</p>
    <div style={{display:"flex",gap:8}}>
      <button style={S.secBtn} onClick={onClose}>Cancel</button>
      <button style={{...S.primaryBtn,flex:1}} onClick={()=>{exportData(xids,from,to);onClose();}}><I.Download/> Download CSV</button>
    </div>
  </div></div>);
}

/* ═══ AUTH ═══ */
function AuthScreen({onLogin}){
  const[mode,setMode]=useState("login");const[email,setEmail]=useState("");const[pass,setPass]=useState("");const[name,setName]=useState("");const[error,setError]=useState("");const[loading,setLoading]=useState(false);
  const go=async()=>{if(!email||!pass)return;setLoading(true);setError("");
    if(mode==="signup"){const{error}=await sb.auth.signUp({email,password:pass,options:{data:{name:name||email.split("@")[0]}}});if(error){setError(error.message);setLoading(false);return;}setError("Check your email for verification link, then sign in.");setMode("login");setLoading(false);}
    else{const{data,error}=await sb.auth.signInWithPassword({email,password:pass});if(error){setError(error.message);setLoading(false);return;}onLogin(data.user);}
  };
  return(<div style={S.authBg}><div style={S.authCard}>
    <div style={{textAlign:"center",marginBottom:8}}><Logo size={28}/></div>
    <p style={{fontSize:11,color:"#3d4555",textAlign:"center",marginBottom:16}}>You control the conversation</p>
    <div style={{height:1,background:"rgba(255,255,255,0.04)",marginBottom:20}}/>
    <h2 style={{fontSize:17,fontWeight:700,color:"#e2e8f0",marginBottom:20,textAlign:"center"}}>{mode==="login"?"Sign in":"Create account"}</h2>
    {error&&<div style={{padding:"8px 12px",borderRadius:8,background:error.includes("Check")?"rgba(72,187,120,0.1)":"rgba(232,93,93,0.1)",color:error.includes("Check")?"#48bb78":"#e85d5d",fontSize:12,marginBottom:14,textAlign:"center"}}>{error}</div>}
    {mode==="signup"&&<div style={{marginBottom:14}}><label style={S.fLabel}>Name</label><input style={S.inp} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/></div>}
    <div style={{marginBottom:14}}><label style={S.fLabel}>Email</label><input style={S.inp} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
    <div style={{marginBottom:14}}><label style={S.fLabel}>Password</label><input style={S.inp} type="password" placeholder="Min 6 characters" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
    <button style={{...S.primaryBtn,width:"100%",marginTop:4,opacity:(email&&pass&&!loading)?1:0.4}} onClick={go}>{loading?"...":(mode==="login"?"Sign In":"Create Account")}</button>
    <p style={{fontSize:11.5,color:"#3d4555",marginTop:18,textAlign:"center"}}>{mode==="login"?"New here?":"Have an account?"}{" "}<button style={{color:"#E5A835",fontWeight:600,fontSize:11.5,textDecoration:"underline"}} onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}>{mode==="login"?"Create account":"Sign in"}</button></p>
  </div></div>);
}

/* ═══ ACCEPT MODAL ═══ */
function AcceptModal({onClose,onAccept}){
  const[code,setCode]=useState("");const[loading,setLoading]=useState(false);
  const go=async()=>{if(!code.trim())return;setLoading(true);await onAccept(code.trim());setLoading(false);};
  return(<div style={S.ov} onClick={onClose}><div style={S.modalBox} onClick={e=>e.stopPropagation()}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(229,168,53,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#E5A835"}}><I.Link/></div><h3 style={{fontSize:16,fontWeight:700,color:"#fff"}}>Accept an XID</h3></div>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Paste the code someone shared with you.</p>
    <input style={{...S.inp,textAlign:"center",fontSize:16,fontFamily:"monospace",letterSpacing:"0.08em",padding:"14px 16px",border:"1px solid rgba(229,168,53,0.25)",background:"rgba(229,168,53,0.04)"}} placeholder="XID-XXXXXXX" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
    <div style={{display:"flex",gap:8,marginTop:14}}><button style={S.secBtn} onClick={onClose}>Cancel</button><button style={{...S.primaryBtn,flex:1,opacity:code.trim()&&!loading?1:0.35}} onClick={go}>{loading?"Connecting...":<><I.Link/> Connect</>}</button></div>
  </div></div>);
}

/* ═══ SHARE MODAL ═══ */
function ShareModal({xid,onClose,onCopy}){
  return(<div style={S.ov} onClick={onClose}><div style={S.modalBox} onClick={e=>e.stopPropagation()}>
    <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:4}}>Share this XID</h3>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Send this code. They connect without seeing your identity.</p>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:9,background:"rgba(229,168,53,0.04)",border:"1px solid rgba(229,168,53,0.12)"}}><code style={{fontSize:20,fontWeight:700,color:"#E5A835"}}>{xid.xid||xid.xid_code}</code><button style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:5,background:"rgba(229,168,53,0.1)",color:"#E5A835",fontSize:10,fontWeight:600}} onClick={()=>onCopy(xid.xid||xid.xid_code)}><I.Copy/> Copy</button></div>
    <button style={{...S.secBtn,width:"100%",marginTop:14}} onClick={onClose}>Done</button>
  </div></div>);
}

/* ═══ MAIN APP ═══ */
export default function App(){
  const[user,setUser]=useState(null);const[profile,setProfile]=useState(null);const[loading,setLoading]=useState(true);
  const[xids,setXids]=useState([]);const[view,setView]=useState("dashboard");
  const[actXid,setActXid]=useState(null);const[actConvo,setActConvo]=useState(null);
  const[showKill,setShowKill]=useState(null);const[showAccept,setShowAccept]=useState(false);
  const[showShare,setShowShare]=useState(null);const[showExport,setShowExport]=useState(false);
  const[toast,setToast]=useState(null);const[sideQ,setSideQ]=useState("");const[dashQ,setDashQ]=useState("");

  useEffect(()=>{sb.auth.getSession().then(({data:{session}})=>{if(session?.user){setUser(session.user);loadProfile(session.user.id);loadXids(session.user.id);}setLoading(false);});
    const{data:{subscription}}=sb.auth.onAuthStateChange((_,session)=>{if(session?.user){setUser(session.user);loadProfile(session.user.id);loadXids(session.user.id);}else{setUser(null);setProfile(null);setXids([]);}});
    return()=>subscription.unsubscribe();},[]);

  useEffect(()=>{const iv=setInterval(()=>{setXids(p=>p.map(x=>{if(x.status==="active"&&x.expires_at&&new Date(x.expires_at)<=new Date()){sb.from("xids").update({status:"expired"}).eq("id",x.id);return{...x,status:"expired"};}return x;}));},1e4);return()=>clearInterval(iv);},[]);

  useEffect(()=>{if(!user)return;const ch=sb.channel("msgs").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},()=>loadXids(user.id)).subscribe();return()=>{sb.removeChannel(ch);};},[user]);

  const loadProfile=async uid=>{const{data}=await sb.from("profiles").select("*").eq("id",uid).single();if(data)setProfile(data);};
  const loadXids=async uid=>{
    const{data:owned}=await sb.from("xids").select("*").eq("user_id",uid).order("created_at",{ascending:false});
    const{data:connected}=await sb.from("conversations").select("xid_id").eq("participant_id",uid);
    const cIds=(connected||[]).map(c=>c.xid_id).filter(id=>!(owned||[]).find(x=>x.id===id));
    let cXids=[];if(cIds.length>0){const{data}=await sb.from("xids").select("*").in("id",cIds);cXids=data||[];}
    const all=[...(owned||[]),...cXids];
    const full=await Promise.all(all.map(async x=>{
      const{data:cvs}=await sb.from("conversations").select("*").eq("xid_id",x.id).order("created_at");
      const fCvs=await Promise.all((cvs||[]).map(async c=>{
        const{data:ms}=await sb.from("messages").select("*").eq("conversation_id",c.id).order("created_at");
        return{...c,messages:(ms||[]).map(m=>({id:m.id,from:m.sender_id===uid?"me":"them",sender:m.sender_id===uid?null:c.display_name,text:m.content,ts:m.created_at}))};
      }));
      return{...x,xidType:x.xid_type,maxConn:x.max_conn,maxMsgs:x.max_msgs,activeHours:x.active_hours,xid:x.xid_code,conversations:fCvs,isOwner:x.user_id===uid};
    }));
    setXids(full);
  };

  if(loading)return<div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#090c11"}}><Logo size={32}/></div>;
  if(!user)return<AuthScreen onLogin={u=>{setUser(u);loadProfile(u.id);loadXids(u.id);}}/>;

  const allActive=xids.filter(x=>x.status==="active"),allClosed=xids.filter(x=>x.status!=="active");
  const activeL=sideQ?allActive.filter(x=>xidMatch(x,sideQ)):allActive;
  const closedL=sideQ?allClosed.filter(x=>xidMatch(x,sideQ)):allClosed;
  const totM=x=>(x.conversations||[]).reduce((s,c)=>s+(c.messages||[]).length,0);

  const createXid=async d=>{
    const mc=d.maxConn===""?null:(d.maxConn===0?0:parseInt(d.maxConn));const mm=d.maxMsgs===""?null:(d.maxMsgs===0?0:parseInt(d.maxMsgs));
    if(mc!==null&&isNaN(mc)){setToast("Invalid connection limit");return;}
    if(mm!==null&&isNaN(mm)){setToast("Invalid message limit");return;}
    const{data,error}=await sb.from("xids").insert({user_id:user.id,xid_code:genXID(),label:d.label,xid_type:d.xidType,duration:d.duration,active_hours:d.activeHours,max_conn:mc,max_msgs:mm,status:"active",expires_at:getExp(d.duration),creator_tz:getUserTZ()}).select().single();
    if(error){setToast("Error: "+error.message);return;}
    await loadXids(user.id);setView("dashboard");setToast("XID created!");setShowShare({...data,xid:data.xid_code});
  };
  const killXid=async id=>{await sb.from("xids").update({status:"revoked"}).eq("id",id);setShowKill(null);setToast("XID killed.");if(actXid?.id===id){setView("dashboard");setActConvo(null);setActXid(null);}await loadXids(user.id);};
  const sendMsg=async(cid,text)=>{
    // Check active hours before sending
    const xidForConvo=xids.find(x=>(x.conversations||[]).some(c=>c.id===cid));
    if(xidForConvo){
      const ah=xidForConvo.activeHours||xidForConvo.active_hours||"any";
      const tz=xidForConvo.creator_tz||getUserTZ();
      if(!checkActiveHours(ah,tz)){
        const currentHour=getHourInTZ(tz);
        setToast(`Outside active hours (${getAH(ah)}). Current time in creator's timezone: ${currentHour}:00`);return;
      }
      // Check message limit
      if(xidForConvo.maxMsgs!=null||xidForConvo.max_msgs!=null){
        const limit=xidForConvo.maxMsgs??xidForConvo.max_msgs;
        const total=(xidForConvo.conversations||[]).reduce((s,c)=>s+(c.messages||[]).length,0);
        if(total>=limit){setToast(`Message limit reached (${total}/${limit})`);return;}
      }
      // Check expiry
      if(xidForConvo.expires_at&&new Date(xidForConvo.expires_at)<=new Date()){setToast("This XID has expired.");return;}
    }
    const tmp={id:"t"+Date.now(),from:"me",sender:null,text,ts:new Date().toISOString()};
    setXids(p=>p.map(x=>({...x,conversations:(x.conversations||[]).map(c=>c.id===cid?{...c,messages:[...(c.messages||[]),tmp]}:c)})));
    await sb.from("messages").insert({conversation_id:cid,sender_id:user.id,content:text});
  };
  const acceptXid=async code=>{
    const{data:xid}=await sb.from("xids").select("*").eq("xid_code",code).eq("status","active").single();
    if(!xid){alert("XID not found or inactive.");setShowAccept(false);return;}
    if(xid.user_id===user.id){alert("Cannot accept your own XID.");setShowAccept(false);return;}
    // Check expiry
    if(xid.expires_at&&new Date(xid.expires_at)<=new Date()){alert("This XID has expired.");setShowAccept(false);return;}
    // Check connection limit
    if(xid.max_conn!==null&&xid.max_conn!==undefined&&xid.max_conn>=0){
      const{data:existingConvos}=await sb.from("conversations").select("id").eq("xid_id",xid.id);
      const currentCount=(existingConvos||[]).length;
      if(currentCount>=xid.max_conn){alert(`Connection limit reached (${currentCount}/${xid.max_conn}). This XID cannot accept more connections.`);setShowAccept(false);return;}
    }
    const{data:ex}=await sb.from("conversations").select("*").eq("xid_id",xid.id).eq("participant_id",user.id);
    if(ex&&ex.length>0){await loadXids(user.id);setShowAccept(false);setToast("Already connected!");return;}
    const dn=profile?.name||user.email.split("@")[0];
    await sb.from("conversations").insert({xid_id:xid.id,participant_id:user.id,display_name:dn});
    await loadXids(user.id);setShowAccept(false);setToast("Connected to "+xid.label+"!");
  };
  const cp=v=>{navigator.clipboard?.writeText(v);setToast("Copied!");};
  const openX=(x,c)=>{setActXid(x);setActConvo(x.xidType==="group"?(x.conversations[0]||null):(c||x.conversations[0]||null));setView("chat");};

  return(<div style={S.root}><style>{CSS}</style>
    <nav style={S.side}>
      <div style={{padding:"16px 14px 10px"}}><Logo size={18}/></div>
      <div style={{padding:"2px 10px 6px",display:"flex",gap:5}}>
        <button style={S.sideBtn1} onClick={()=>setView("create")} onMouseEnter={e=>{e.currentTarget.style.background="#E5A835";e.currentTarget.style.color="#1a1207";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(229,168,53,0.08)";e.currentTarget.style.color="#E5A835";}}><I.Plus/> New</button>
        <button style={S.sideBtn2} onClick={()=>setShowAccept(true)} onMouseEnter={e=>e.currentTarget.style.background="rgba(27,79,114,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(27,79,114,0.06)"}><I.Link/> Accept</button>
      </div>
      <div style={{padding:"0 10px 6px"}}><SearchBox value={sideQ} onChange={setSideQ} placeholder="Search XIDs and messages..." small/></div>
      <div style={S.navB}>
        <div style={S.navLabel}>ACTIVE</div>
        {activeL.length===0&&<div style={S.navEmpty}>{sideQ?"No matches":"No active XIDs"}</div>}
        {activeL.map(x=><button key={x.id} style={{...S.navItem,background:actXid?.id===x.id&&view==="chat"?"rgba(229,168,53,0.05)":"transparent",borderLeft:actXid?.id===x.id&&view==="chat"?"2px solid #E5A835":"2px solid transparent"}} onClick={()=>openX(x)}>
          <div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:x.xidType==="group"?"#1B4F72":"#4a5568",display:"flex"}}>{x.xidType==="group"?<I.Users/>:<I.User/>}</span><span style={{fontSize:11.5,fontWeight:600,color:"#c8cdd5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</span>{!x.isOwner&&<span style={{fontSize:7.5,padding:"1px 4px",borderRadius:3,background:"rgba(229,168,53,0.1)",color:"#E5A835",fontWeight:700}}>JOINED</span>}</div></div>
          <span style={{fontSize:9,color:"#3d4555"}}>{fmtLeft(x.expires_at)}</span>
        </button>)}
      </div>
      <div style={S.navB}>
        <div style={S.navLabel}>CLOSED</div>
        {closedL.length===0&&<div style={S.navEmpty}>{sideQ?"No matches":"-"}</div>}
        {closedL.map(x=><button key={x.id} style={{...S.navItem,opacity:0.4}} onClick={()=>openX(x)}><div style={{flex:1,minWidth:0}}><span style={{fontSize:11.5,color:"#5a6577"}}>{x.label}</span></div><span style={{fontSize:7.5,padding:"2px 5px",borderRadius:3,background:"rgba(255,255,255,0.04)",color:"#3d4555",textTransform:"uppercase",fontWeight:600}}>{x.status}</span></button>)}
      </div>
      <div style={S.sideFoot}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:22,height:22,borderRadius:5,background:"rgba(229,168,53,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#E5A835",fontSize:10,fontWeight:700}}>{(profile?.name||"?")[0].toUpperCase()}</div><span style={{fontSize:10.5,fontWeight:600,color:"#8891a0"}}>{profile?.name||user.email}</span></div>
          <div style={{display:"flex",gap:4}}>
            <button style={{color:"#4a5568",padding:3}} onClick={()=>setShowExport(true)} title="Export data"><I.Download/></button>
            <button style={{color:"#4a5568",padding:3}} onClick={async()=>{await sb.auth.signOut();setUser(null);setProfile(null);setXids([]);setView("dashboard");}} title="Sign out"><I.Logout/></button>
          </div>
        </div>
      </div>
    </nav>
    <main style={S.main}>
      {view==="dashboard"&&<Dash xids={xids} dashQ={dashQ} setDashQ={setDashQ} onCreate={()=>setView("create")} onOpen={openX} onCp={cp} onKill={id=>setShowKill(id)} onShare={x=>setShowShare(x)} tm={totM} onAccept={()=>setShowAccept(true)} onExport={()=>setShowExport(true)}/>}
      {view==="create"&&<CreateXID onSubmit={createXid} onCancel={()=>setView("dashboard")}/>}
      {view==="chat"&&actXid&&(()=>{const fx=xids.find(x=>x.id===actXid.id)||actXid;const fc=actConvo?fx.conversations?.find(c=>c.id===actConvo.id)||fx.conversations?.[0]||null:fx.conversations?.[0]||null;
        return<ChatV xid={fx} userId={user.id} convo={fc} onSelConvo={setActConvo} onBack={()=>{setView("dashboard");setActXid(null);setActConvo(null);}} onSend={sendMsg} onKill={()=>setShowKill(actXid.id)} onCp={cp} onShare={()=>setShowShare(fx)}/>;
      })()}
    </main>
    {showKill&&<div style={S.ov} onClick={()=>setShowKill(null)}><div style={S.modalBox} onClick={e=>e.stopPropagation()}><div style={{width:40,height:40,borderRadius:10,background:"rgba(232,93,93,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#e85d5d",margin:"0 auto 12px"}}><I.Power/></div><h3 style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:6,textAlign:"center"}}>Kill this XID?</h3><p style={{fontSize:12,color:"#5a6577",lineHeight:1.6,marginBottom:20,textAlign:"center"}}>All conversations permanently destroyed.</p><div style={{display:"flex",gap:8}}><button style={S.secBtn} onClick={()=>setShowKill(null)}>Cancel</button><button style={{...S.primaryBtn,flex:1,background:"#e85d5d"}} onClick={()=>killXid(showKill)}>Kill XID</button></div></div></div>}
    {showAccept&&<AcceptModal onClose={()=>setShowAccept(false)} onAccept={acceptXid}/>}
    {showShare&&<ShareModal xid={showShare} onClose={()=>setShowShare(null)} onCopy={cp}/>}
    {showExport&&<ExportModal xids={xids} onClose={()=>setShowExport(false)}/>}
    {toast&&<Toast message={toast} onDone={()=>setToast(null)}/>}
  </div>);
}

/* ═══ DASHBOARD ═══ */
function Dash({xids,dashQ,setDashQ,onCreate,onOpen,onCp,onKill,onShare,tm,onAccept,onExport}){
  const filtered=dashQ?xids.filter(x=>xidMatch(x,dashQ)):xids;
  return(<div style={S.dashW}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,gap:12}}>
      <div><h1 style={{fontSize:20,fontWeight:800,color:"#fff"}}><Logo size={22}/> Dashboard</h1><p style={{fontSize:12,color:"#4a5568",marginTop:3}}>Manage XIDs and conversations</p></div>
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        <button style={S.dashExBtn} onClick={onExport}><I.Download/> Export</button>
        <button style={S.dashAccBtn} onClick={onAccept}><I.Link/> Accept</button>
        <button style={S.dashNewBtn} onClick={onCreate} onMouseEnter={e=>{e.currentTarget.style.background="#E5A835";e.currentTarget.style.color="#1a1207";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(229,168,53,0.08)";e.currentTarget.style.color="#E5A835";}}><I.Plus/> New XID</button>
      </div>
    </div>
    <div style={{marginBottom:16}}><SearchBox value={dashQ} onChange={setDashQ} placeholder="Search all XIDs, connections, messages..."/></div>
    {filtered.length===0?<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 20px",textAlign:"center"}}>
      <div style={{width:48,height:48,borderRadius:12,background:"rgba(229,168,53,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:"#E5A835",marginBottom:14}}><I.Shield/></div>
      <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>{dashQ?"No results":"Your conversations, your rules"}</h3>
      <p style={{fontSize:12,color:"#4a5568",maxWidth:360,lineHeight:1.6,marginBottom:18}}>{dashQ?"Try a different search.":"Create an XID to chat without sharing personal info."}</p>
      {!dashQ&&<div style={{display:"flex",gap:6}}><button style={S.primaryBtn} onClick={onCreate}><I.Plus/> Create XID</button><button style={{padding:"9px 16px",borderRadius:8,border:"1px solid rgba(27,79,114,0.2)",color:"#1B4F72",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}} onClick={onAccept}><I.Link/> Accept XID</button></div>}
    </div>
    :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>{filtered.map((x,i)=><Card key={x.id} x={x} i={i} onOpen={c=>onOpen(x,c)} onCp={()=>onCp(x.xid||x.xid_code)} onKill={()=>onKill(x.id)} onShare={()=>onShare(x)} tm={tm(x)}/>)}</div>}
  </div>);
}

/* ═══ CARD ═══ */
function Card({x,i,onOpen,onCp,onKill,onShare,tm}){
  const act=x.status==="active",isG=x.xidType==="group";
  return(<div style={{background:"rgba(255,255,255,0.015)",border:"1px solid",borderColor:act?"rgba(229,168,53,0.08)":"rgba(255,255,255,0.03)",borderRadius:10,padding:13,position:"relative",overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
      <div><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
        <span style={{fontSize:8.5,fontWeight:700,padding:"2px 5px",borderRadius:3,display:"flex",alignItems:"center",gap:2,background:isG?"rgba(27,79,114,0.1)":"rgba(229,168,53,0.08)",color:isG?"#1B4F72":"#E5A835"}}>{isG?<><I.Users/> GRP</>:<><I.User/> 1:1</>}</span>
        <span style={{fontSize:8.5,fontWeight:600,padding:"2px 5px",borderRadius:3,background:act?"rgba(72,187,120,0.1)":"rgba(255,255,255,0.04)",color:act?"#48bb78":x.status==="revoked"?"#e85d5d":"#4a5568"}}>{act?"Live":x.status}</span>
        {!x.isOwner&&<span style={{fontSize:7,padding:"1px 4px",borderRadius:2,background:"rgba(229,168,53,0.08)",color:"#E5A835",fontWeight:700}}>JOINED</span>}
      </div><h3 style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{x.label}</h3></div>
      {act&&x.isOwner&&<button style={{padding:5,borderRadius:5,background:"rgba(229,168,53,0.05)",color:"#E5A835"}} onClick={e=>{e.stopPropagation();onShare();}}><I.Share/></button>}
    </div>
    <button style={S.xidBtn} onClick={e=>{e.stopPropagation();onCp();}}><code>{x.xid||x.xid_code}</code><I.Copy/></button>
    <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}><span style={S.tag}><I.Clock/>{fmtLeft(x.expires_at)}</span><span style={S.tag}><I.Chat/>{tm}{x.maxMsgs!=null?`/${x.maxMsgs}`:""} msgs</span><span style={S.tag}><I.Users/>{(x.conversations||[]).length}{x.maxConn!=null?`/${x.maxConn}`:""} connected</span>{(x.activeHours||x.active_hours)&&(x.activeHours||x.active_hours)!=="any"&&<span style={S.tag}>{getAH(x.activeHours||x.active_hours)}</span>}</div>
    <div style={{display:"flex",gap:5,marginTop:3}}>
      <button style={S.cardBtn} onClick={()=>onOpen(null)} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.025)"}><I.Chat/>{act?"Open":"View"}</button>
      {act&&x.isOwner&&<button style={S.killBtn} onClick={e=>{e.stopPropagation();onKill();}} onMouseEnter={e=>e.currentTarget.style.background="rgba(232,93,93,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(232,93,93,0.04)"}><I.Trash/></button>}
    </div>
  </div>);
}

/* ═══ CREATE ═══ */
function CreateXID({onSubmit,onCancel}){
  const[label,setLabel]=useState("");const[xidType,setXT]=useState("individual");const[dur,setDur]=useState("24h");const[ah,setAH]=useState("any");
  const[mcMode,setMCMode]=useState("unlimited");const[mcVal,setMCVal]=useState("");
  const[mmMode,setMMMode]=useState("unlimited");const[mmVal,setMMVal]=useState("");
  const[loading,setLoading]=useState(false);
  const go=async()=>{if(!label.trim()||loading)return;setLoading(true);await onSubmit({label:label.trim(),xidType,duration:dur,activeHours:ah,maxConn:mcMode==="unlimited"?"":mcVal,maxMsgs:mmMode==="unlimited"?"":mmVal});setLoading(false);};
  return(<div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}><button style={S.backBtn} onClick={onCancel}><I.Back/> Dashboard</button><div style={{maxWidth:520}}>
    <h2 style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:3}}>New XID</h2>
    <p style={{fontSize:12,color:"#4a5568",marginBottom:20}}>Set the rules. Share the code. You are in control.</p>
    <div style={S.fs}><label style={S.fLabel}>What is this for?</label><input style={S.inp} placeholder='e.g. "OLX Sofa Buyer"' value={label} onChange={e=>setLabel(e.target.value)} autoFocus/></div>
    <div style={S.fs}><label style={S.fLabel}>Type</label><div style={{display:"flex",gap:8}}>
      <button style={{...S.typeBtn,borderColor:xidType==="individual"?"rgba(229,168,53,0.3)":"rgba(255,255,255,0.06)",background:xidType==="individual"?"rgba(229,168,53,0.05)":"transparent"}} onClick={()=>setXT("individual")}><div style={{color:xidType==="individual"?"#E5A835":"#4a5568",marginBottom:3}}><I.User/></div><div style={{fontSize:11.5,fontWeight:600,color:xidType==="individual"?"#c8cdd5":"#5a6577"}}>Individual</div><div style={{fontSize:9.5,color:"#4a5568",marginTop:1}}>Separate chat per person</div></button>
      <button style={{...S.typeBtn,borderColor:xidType==="group"?"rgba(27,79,114,0.4)":"rgba(255,255,255,0.06)",background:xidType==="group"?"rgba(27,79,114,0.05)":"transparent"}} onClick={()=>setXT("group")}><div style={{color:xidType==="group"?"#1B4F72":"#4a5568",marginBottom:3}}><I.Users/></div><div style={{fontSize:11.5,fontWeight:600,color:xidType==="group"?"#c8cdd5":"#5a6577"}}>Group</div><div style={{fontSize:9.5,color:"#4a5568",marginTop:1}}>Everyone in one chat</div></button>
    </div></div>
    <div style={{display:"flex",gap:10,...S.fs}}><div style={{flex:1}}><label style={S.fLabel}>Expires After</label><Sel options={durOpts} value={dur} onChange={setDur}/></div><div style={{flex:1}}><label style={S.fLabel}>Active Hours</label><Sel options={ahOpts} value={ah} onChange={setAH}/></div></div>
    <div style={{display:"flex",gap:10,...S.fs}}>
      <div style={{flex:1}}><label style={S.fLabel}>Connection Limit</label><div style={{display:"flex",gap:4,marginBottom:4}}><button style={{...S.togBtn,background:mcMode==="unlimited"?"rgba(229,168,53,0.08)":"transparent",color:mcMode==="unlimited"?"#E5A835":"#4a5568",borderColor:mcMode==="unlimited"?"rgba(229,168,53,0.2)":"rgba(255,255,255,0.06)"}} onClick={()=>{setMCMode("unlimited");setMCVal("");}}>Unlimited</button><button style={{...S.togBtn,background:mcMode==="limit"?"rgba(229,168,53,0.08)":"transparent",color:mcMode==="limit"?"#E5A835":"#4a5568",borderColor:mcMode==="limit"?"rgba(229,168,53,0.2)":"rgba(255,255,255,0.06)"}} onClick={()=>setMCMode("limit")}>Limit</button></div>{mcMode==="limit"&&<input style={S.inp} placeholder="e.g. 5" value={mcVal} onChange={e=>setMCVal(e.target.value.replace(/[^0-9]/g,""))}/>}</div>
      <div style={{flex:1}}><label style={S.fLabel}>Max Messages</label><div style={{display:"flex",gap:4,marginBottom:4}}><button style={{...S.togBtn,background:mmMode==="unlimited"?"rgba(229,168,53,0.08)":"transparent",color:mmMode==="unlimited"?"#E5A835":"#4a5568",borderColor:mmMode==="unlimited"?"rgba(229,168,53,0.2)":"rgba(255,255,255,0.06)"}} onClick={()=>{setMMMode("unlimited");setMMVal("");}}>Unlimited</button><button style={{...S.togBtn,background:mmMode==="limit"?"rgba(229,168,53,0.08)":"transparent",color:mmMode==="limit"?"#E5A835":"#4a5568",borderColor:mmMode==="limit"?"rgba(229,168,53,0.2)":"rgba(255,255,255,0.06)"}} onClick={()=>setMMMode("limit")}>Limit</button></div>{mmMode==="limit"&&<input style={S.inp} placeholder="e.g. 50" value={mmVal} onChange={e=>setMMVal(e.target.value.replace(/[^0-9]/g,""))}/>}</div>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button style={S.secBtn} onClick={onCancel}>Cancel</button><button style={{...S.primaryBtn,opacity:label.trim()&&!loading?1:0.35}} onClick={go}>{loading?"Creating...":<><I.Plus/> Create XID</>}</button></div>
  </div></div>);
}

/* ═══ CHAT ═══ */
function ChatV({xid:x,userId,convo,onSelConvo,onBack,onSend,onKill,onCp,onShare}){
  const[input,setInput]=useState("");const[sending,setSending]=useState(false);const[chatQ,setChatQ]=useState("");const[cvQ,setCvQ]=useState("");const endRef=useRef(null);
  const act=x.status==="active",isG=x.xidType==="group",cur=convo||x.conversations[0]||null;
  const totM=(x.conversations||[]).reduce((s,c)=>s+(c.messages||[]).length,0);const atLim=x.maxMsgs!=null&&totM>=x.maxMsgs;
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[cur?.messages]);
  const doSend=async()=>{if(!input.trim()||!act||atLim||!cur||sending)return;setSending(true);await onSend(cur.id,input.trim());setInput("");setSending(false);};
  const fCvs=useMemo(()=>cvQ?x.conversations.filter(c=>cvMatch(c,cvQ)):x.conversations,[x.conversations,cvQ]);
  const filtMsgs=useMemo(()=>{if(!chatQ||!cur)return cur?.messages||[];return(cur.messages||[]).filter(m=>(m.text||"").toLowerCase().includes(chatQ.toLowerCase()));},[(cur?.messages||[]).length,chatQ]);
  const hlQ=chatQ.toLowerCase();

  return(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
      <button style={{color:"#5a6577",padding:3}} onClick={onBack}><I.Back/></button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><h3 style={{fontSize:13,fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</h3><span style={{fontSize:7.5,fontWeight:700,padding:"2px 5px",borderRadius:3,background:isG?"rgba(27,79,114,0.1)":"rgba(229,168,53,0.08)",color:isG?"#1B4F72":"#E5A835"}}>{isG?"GRP":"1:1"}</span><span style={{width:5,height:5,borderRadius:"50%",background:act?"#48bb78":"#e85d5d"}}/></div>
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9.5,color:"#3d4555",marginTop:1}}><span>{x.xid||x.xid_code}</span><span>·</span><span>{fmtLeft(x.expires_at)}</span><span>·</span><span>{(x.conversations||[]).length} connected</span></div>
      </div>
      <div style={{display:"flex",gap:4}}>
        {act&&x.isOwner&&<button style={{padding:"4px 8px",borderRadius:5,fontSize:10,fontWeight:600,color:"#E5A835",background:"rgba(229,168,53,0.06)"}} onClick={onShare}><I.Share/></button>}
        {act&&x.isOwner&&<button style={{padding:"4px 8px",borderRadius:5,fontSize:10,fontWeight:600,color:"#e85d5d"}} onClick={onKill}>Kill</button>}
      </div>
    </div>
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {!isG&&(x.conversations||[]).length>1&&<div style={{width:170,borderRight:"1px solid rgba(255,255,255,0.04)",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"6px 8px 4px",fontSize:8,fontWeight:700,color:"#2d3748",textTransform:"uppercase",letterSpacing:"0.1em"}}>Threads</div>
        <div style={{padding:"2px 6px 4px"}}><SearchBox value={cvQ} onChange={setCvQ} placeholder="Search threads..." small/></div>
        {fCvs.map(c=><button key={c.id} style={{width:"100%",padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:cur?.id===c.id?"#c8cdd5":"#5a6577",textAlign:"left",background:cur?.id===c.id?"rgba(229,168,53,0.05)":"transparent",borderLeft:cur?.id===c.id?"2px solid #E5A835":"2px solid transparent"}} onClick={()=>onSelConvo(c)}><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{c.display_name}</span><span style={{fontSize:8.5,color:"#3d4555"}}>{(c.messages||[]).length}</span></button>)}
      </div>}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Message search bar */}
        <div style={{padding:"6px 14px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><SearchBox value={chatQ} onChange={setChatQ} placeholder="Search messages..." small/></div>
        <div style={{flex:1,overflowY:"auto",padding:"10px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 9px",borderRadius:7,background:"rgba(27,79,114,0.04)",border:"1px solid rgba(27,79,114,0.06)",fontSize:9.5,color:"#3d4555",marginBottom:12}}><I.Shield/><span>Protected by XIDgate. No personal info exchanged.</span></div>
          {chatQ&&<div style={{fontSize:10,color:"#E5A835",marginBottom:8}}>{filtMsgs.length} result{filtMsgs.length!==1?"s":""} for "{chatQ}"</div>}
          {cur&&filtMsgs.length>0?filtMsgs.map(m=><div key={m.id} style={{display:"flex",marginBottom:5,justifyContent:m.from==="me"?"flex-end":"flex-start"}}><div style={{maxWidth:"75%",padding:"7px 11px",borderRadius:m.from==="me"?"11px 11px 3px 11px":"11px 11px 11px 3px",background:m.from==="me"?"rgba(229,168,53,0.08)":"rgba(255,255,255,0.035)",color:m.from==="me"?"#d4c4a0":"#b0b8c4",...(chatQ&&(m.text||"").toLowerCase().includes(hlQ)?{boxShadow:"0 0 0 1px rgba(229,168,53,0.3)"}:{})}}>{m.from!=="me"&&m.sender&&<div style={{fontSize:9,fontWeight:700,color:isG?"#1B4F72":"#E5A835",marginBottom:1}}>{m.sender}</div>}<div style={{fontSize:12.5,lineHeight:1.5}}>{m.text}</div><div style={{fontSize:8,color:"#2d3748",marginTop:2,textAlign:"right"}}>{timeFull(m.ts)}</div></div></div>)
          :cur&&!chatQ?<div style={{textAlign:"center",padding:40,color:"#2d3748",fontSize:12}}>{(cur.messages||[]).length>0?"":"No messages yet. Say hello!"}</div>
          :<div style={{textAlign:"center",padding:40,color:"#2d3748",fontSize:12}}>{chatQ?"No matching messages.":"Share your XID to start."}</div>}
          <div ref={endRef}/>
        </div>
        {act?(atLim?<div style={S.closedBar}><I.Chat/> Message limit reached.</div>:cur?<div style={S.inputBar}><input style={S.chatInput} placeholder={isG?"Message group...":"Type a message..."} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSend()}/><button style={{...S.sendBtn,opacity:input.trim()&&!sending?1:0.2}} onClick={doSend}><I.Send/></button></div>:<div style={S.closedBar}><I.Globe/> Share your XID code to start.</div>):<div style={S.closedBar}><I.Lock/> This XID is {x.status}.</div>}
      </div>
    </div>
  </div>);
}

/* ═══ CSS ═══ */
const CSS=`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.04);border-radius:2px}input:focus{outline:none;border-color:rgba(229,168,53,0.3)!important}button{cursor:pointer;border:none;background:none;font-family:inherit}button:active{transform:scale(0.97)}::selection{background:rgba(229,168,53,0.2)}@keyframes toastIn{from{transform:translateY(20px) translateX(-50%);opacity:0}to{transform:translateY(0) translateX(-50%);opacity:1}}`;

const S={
root:{display:"flex",height:"100vh",background:"#090c11",color:"#c8cdd5",fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:"hidden"},
side:{width:250,borderRight:"1px solid rgba(255,255,255,0.04)",display:"flex",flexDirection:"column",background:"#070a0f",flexShrink:0},
sideBtn1:{flex:1,padding:"7px",borderRadius:7,background:"rgba(229,168,53,0.08)",color:"#E5A835",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.15s",border:"1px solid rgba(229,168,53,0.15)"},
sideBtn2:{flex:1,padding:"7px",borderRadius:7,background:"rgba(27,79,114,0.06)",color:"#1B4F72",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.15s",border:"1px solid rgba(27,79,114,0.12)"},
searchB:{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",color:"#3d4555"},
searchInp:{flex:1,background:"transparent",border:"none",color:"#c8cdd5",fontSize:11,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"},
navB:{padding:"2px 0",flex:1,overflowY:"auto"},
navLabel:{fontSize:8,fontWeight:700,letterSpacing:"0.12em",color:"#2d3748",padding:"7px 12px 3px"},
navEmpty:{padding:"5px 12px",fontSize:10,color:"#1e2533",fontStyle:"italic"},
navItem:{width:"100%",padding:"7px 12px",display:"flex",alignItems:"center",gap:6,transition:"all 0.12s",textAlign:"left"},
sideFoot:{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,0.04)"},
main:{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"},
dashW:{flex:1,overflowY:"auto",padding:"20px 24px"},
dashNewBtn:{padding:"7px 12px",borderRadius:7,background:"rgba(229,168,53,0.08)",color:"#E5A835",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",gap:4,transition:"all 0.15s",border:"1px solid rgba(229,168,53,0.15)"},
dashAccBtn:{padding:"7px 12px",borderRadius:7,border:"1px solid rgba(27,79,114,0.12)",color:"#1B4F72",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",gap:4},
dashExBtn:{padding:"7px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,0.06)",color:"#5a6577",fontSize:11.5,fontWeight:600,display:"flex",alignItems:"center",gap:4},
xidBtn:{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 6px",borderRadius:4,background:"rgba(229,168,53,0.04)",border:"1px solid rgba(229,168,53,0.08)",color:"#E5A835",fontSize:10,cursor:"pointer",marginBottom:6,fontFamily:"monospace"},
tag:{display:"inline-flex",alignItems:"center",gap:2,fontSize:9.5,color:"#3d4555",padding:"2px 5px",borderRadius:3,background:"rgba(255,255,255,0.02)"},
cardBtn:{flex:1,padding:"6px",borderRadius:6,background:"rgba(255,255,255,0.025)",color:"#8891a0",fontSize:10.5,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3,transition:"all 0.12s"},
killBtn:{padding:"6px 8px",borderRadius:6,background:"rgba(232,93,93,0.04)",color:"#e85d5d",transition:"all 0.12s"},
fs:{marginBottom:16},
fLabel:{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#4a5568",marginBottom:5,display:"block"},
inp:{width:"100%",padding:"9px 11px",borderRadius:7,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)",color:"#e2e8f0",fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif",display:"block"},
typeBtn:{flex:1,padding:"12px 10px",borderRadius:9,border:"1px solid",textAlign:"center",transition:"all 0.15s",cursor:"pointer"},
togBtn:{flex:1,padding:"6px",borderRadius:6,border:"1px solid",fontSize:11,fontWeight:700,textAlign:"center",transition:"all 0.12s"},
backBtn:{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"#4a5568",marginBottom:16,fontWeight:500},
primaryBtn:{padding:"9px 16px",borderRadius:8,background:"#E5A835",color:"#1a1207",fontSize:12.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5},
secBtn:{flex:1,padding:"9px",borderRadius:8,background:"rgba(255,255,255,0.04)",color:"#8891a0",fontSize:12,fontWeight:600},
selTr:{width:"100%",padding:"9px 11px",borderRadius:7,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)",fontSize:12,display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"},
selDr:{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:"#111520",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:3,zIndex:50,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.5)"},
selOp:{width:"100%",padding:"7px 9px",borderRadius:5,fontSize:11.5,textAlign:"left"},
inputBar:{display:"flex",gap:6,padding:"8px 14px",borderTop:"1px solid rgba(255,255,255,0.04)",alignItems:"center"},
chatInput:{flex:1,padding:"9px 11px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)",color:"#e2e8f0",fontSize:12.5},
sendBtn:{width:36,height:36,borderRadius:8,background:"#E5A835",color:"#1a1207",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
closedBar:{display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:11,color:"#2d3748"},
ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
modalBox:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:13,padding:22,maxWidth:400,width:"90%"},
modalWide:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:13,padding:22,maxWidth:480,width:"92%"},
toast:{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#1a2332",border:"1px solid rgba(229,168,53,0.15)",color:"#E5A835",padding:"8px 18px",borderRadius:9,fontSize:11.5,fontWeight:600,display:"flex",alignItems:"center",gap:6,zIndex:9999,animation:"toastIn 0.3s ease",boxShadow:"0 8px 30px rgba(0,0,0,0.4)"},
authBg:{width:"100%",height:"100vh",background:"#070a0f",display:"flex",alignItems:"center",justifyContent:"center"},
authCard:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"32px 28px",width:370},
};

'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══ SUPABASE ═══ */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ═══ HELPERS ═══ */
const genXID = () => { const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let r=""; for(let i=0;i<7;i++) r+=c[Math.floor(Math.random()*c.length)]; return `XID-${r}`; };
const timeAgo = d => { if(!d) return ""; const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60) return "now"; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const timeFull = d => { if(!d) return ""; const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60) return "just now"; if(s<3600) return `${Math.floor(s/60)} min ago`; if(s<86400) return `${Math.floor(s/3600)} hours ago`; return `${Math.floor(s/86400)} days ago`; };
const fmtLeft = e => { if(!e) return "No expiry"; const d=new Date(e).getTime()-Date.now(); if(d<=0) return "Expired"; const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000); if(h>24) return `${Math.floor(h/24)}d ${h%24}h`; if(h>0) return `${h}h ${m}m`; return `${m}m`; };
const getExp = dur => { if(dur==="never") return null; const m={"1h":36e5,"6h":216e5,"24h":864e5,"7d":6048e5,"30d":25920e5}; return new Date(Date.now()+(m[dur]||864e5)).toISOString(); };

const ahOpts = [{label:"Any time",value:"any"},{label:"Morning 6AM-12PM",value:"6am-12pm"},{label:"Afternoon 12-6PM",value:"12pm-6pm"},{label:"Evening 6-11PM",value:"6pm-11pm"},{label:"Business 9AM-6PM",value:"9am-6pm"},{label:"After work 6-10PM",value:"6pm-10pm"},{label:"Daytime 8AM-8PM",value:"8am-8pm"},{label:"Night 8PM-2AM",value:"8pm-2am"}];
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
  Zap:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Shield:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Logout:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

/* ═══ SELECT ═══ */
function Sel({options,value,onChange}){
  const[open,setOpen]=useState(false);const ref=useRef(null);const sel=options.find(o=>o.value===value);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return(<div ref={ref} style={{position:"relative"}}><button style={S.selTr} onClick={()=>setOpen(!open)}><span style={{flex:1,color:"#c8cdd5"}}>{sel?.label}</span><span style={{color:"#4a5568",display:"flex",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}><I.Chev/></span></button>
    {open&&<div style={S.selDr}>{options.map(o=><button key={String(o.value)} style={{...S.selOp,background:o.value===value?"rgba(99,179,237,0.08)":"transparent",color:o.value===value?"#63b3ed":"#9aa3b0"}} onClick={()=>{onChange(o.value);setOpen(false);}}>{o.label}</button>)}</div>}
  </div>);
}

/* ═══ TOAST ═══ */
function Toast({message,onDone}){ useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]); return <div style={S.toast}><I.Check/> {message}</div>; }

/* ═══ AUTH SCREEN ═══ */
function AuthScreen({onLogin}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[name,setName]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);

  const go = async () => {
    if(!email||!pass) return;
    setLoading(true); setError("");
    if(mode==="signup"){
      const{error}=await supabase.auth.signUp({email,password:pass,options:{data:{name:name||email.split("@")[0]}}});
      if(error){setError(error.message);setLoading(false);return;}
      setError("Check your email for verification link, then sign in.");
      setMode("login"); setLoading(false);
    } else {
      const{data,error}=await supabase.auth.signInWithPassword({email,password:pass});
      if(error){setError(error.message);setLoading(false);return;}
      onLogin(data.user);
    }
  };

  return(<div style={S.authBg}>
    <div style={S.authCard}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6}}><div style={S.logoI}><I.XH/></div><span style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-0.04em"}}>XIDgate</span></div>
      <p style={{fontSize:11,color:"#3d4555",textAlign:"center",marginBottom:16}}>You control the conversation</p>
      <div style={{height:1,background:"rgba(255,255,255,0.04)",marginBottom:20}}/>
      <h2 style={{fontSize:17,fontWeight:700,color:"#e2e8f0",marginBottom:20,textAlign:"center"}}>{mode==="login"?"Sign in":"Create account"}</h2>
      {error&&<div style={{padding:"8px 12px",borderRadius:8,background:error.includes("Check")?"rgba(72,187,120,0.1)":"rgba(232,93,93,0.1)",color:error.includes("Check")?"#48bb78":"#e85d5d",fontSize:12,marginBottom:14,textAlign:"center"}}>{error}</div>}
      {mode==="signup"&&<div style={{marginBottom:14}}><label style={S.fLabel}>Name</label><input style={S.inp} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/></div>}
      <div style={{marginBottom:14}}><label style={S.fLabel}>Email</label><input style={S.inp} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      <div style={{marginBottom:14}}><label style={S.fLabel}>Password</label><input style={S.inp} type="password" placeholder="Min 6 characters" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      <button style={{...S.primaryBtn,width:"100%",marginTop:4,opacity:(email&&pass&&!loading)?1:0.4}} onClick={go}>{loading?"...":(mode==="login"?"Sign In":"Create Account")}</button>
      <p style={{fontSize:11.5,color:"#3d4555",marginTop:18,textAlign:"center"}}>{mode==="login"?"New here?":"Have an account?"}{" "}<button style={{color:"#63b3ed",fontWeight:600,fontSize:11.5,textDecoration:"underline"}} onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}>{mode==="login"?"Create account":"Sign in"}</button></p>
    </div>
  </div>);
}

/* ═══ MAIN APP ═══ */
export default function App(){
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[loading,setLoading]=useState(true);
  const[xids,setXids]=useState([]);
  const[view,setView]=useState("dashboard");
  const[actXid,setActXid]=useState(null);
  const[actConvo,setActConvo]=useState(null);
  const[showKill,setShowKill]=useState(null);
  const[showAccept,setShowAccept]=useState(false);
  const[showPricing,setShowPricing]=useState(false);
  const[showShare,setShowShare]=useState(null);
  const[toast,setToast]=useState(null);
  const[sideQ,setSideQ]=useState("");

  // Check auth on load
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){setUser(session.user);loadProfile(session.user.id);loadXids(session.user.id);}
      setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){setUser(session.user);loadProfile(session.user.id);loadXids(session.user.id);}
      else{setUser(null);setProfile(null);setXids([]);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  // Auto-expire XIDs
  useEffect(()=>{
    const iv=setInterval(()=>{
      setXids(prev=>prev.map(x=>{
        if(x.status==="active"&&x.expires_at&&new Date(x.expires_at)<=new Date()){
          supabase.from("xids").update({status:"expired"}).eq("id",x.id);
          return{...x,status:"expired"};
        }
        return x;
      }));
    },1e4);
    return()=>clearInterval(iv);
  },[]);

  const loadProfile = async (uid) => {
    const{data}=await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data) setProfile(data);
  };

  const loadXids = async (uid) => {
    // Load XIDs I own
    const{data:owned}=await supabase.from("xids").select("*").eq("user_id",uid).order("created_at",{ascending:false});
    // Load XIDs I'm connected to via conversations
    const{data:connected}=await supabase.from("conversations").select("xid_id").eq("participant_id",uid);
    const connectedIds=(connected||[]).map(c=>c.xid_id).filter(id=>!(owned||[]).find(x=>x.id===id));

    let connectedXids=[];
    if(connectedIds.length>0){
      const{data}=await supabase.from("xids").select("*").in("id",connectedIds);
      connectedXids=data||[];
    }

    const allXids=[...(owned||[]),...connectedXids];

    // Load conversations and messages for each XID
    const fullXids = await Promise.all(allXids.map(async x=>{
      const{data:convos}=await supabase.from("conversations").select("*").eq("xid_id",x.id).order("created_at");
      const fullConvos = await Promise.all((convos||[]).map(async c=>{
        const{data:msgs}=await supabase.from("messages").select("*").eq("conversation_id",c.id).order("created_at");
        return{...c,messages:(msgs||[]).map(m=>({id:m.id,from:m.sender_id===uid?"me":"them",sender:m.sender_id===uid?null:c.display_name,text:m.content,ts:m.created_at}))};
      }));
      return{...x,xidType:x.xid_type,maxConn:x.max_conn,maxMsgs:x.max_msgs,activeHours:x.active_hours,xid:x.xid_code,conversations:fullConvos,isOwner:x.user_id===uid};
    }));

    setXids(fullXids);
  };

  // Realtime messages
  useEffect(()=>{
    if(!user) return;
    const channel = supabase.channel("messages").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},async(payload)=>{
      const msg=payload.new;
      // Reload to get fresh data
      loadXids(user.id);
    }).subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[user]);

  const handleLogin = (u) => {setUser(u);loadProfile(u.id);loadXids(u.id);};
  const handleLogout = async () => {await supabase.auth.signOut();setUser(null);setProfile(null);setXids([]);setView("dashboard");};

  const createXid = async (d) => {
    const mc=d.maxConn===""?null:(parseInt(d.maxConn)||null);
    const mm=d.maxMsgs===""?null:(parseInt(d.maxMsgs)||null);
    const code=genXID();
    const{data,error}=await supabase.from("xids").insert({
      user_id:user.id, xid_code:code, label:d.label, xid_type:d.xidType,
      duration:d.duration, active_hours:d.activeHours, max_conn:mc, max_msgs:mm,
      status:"active", expires_at:getExp(d.duration)
    }).select().single();

    if(error){setToast("Error creating XID: "+error.message);return;}
    await loadXids(user.id);
    setView("dashboard");
    setToast("XID created!");
    setShowShare({...data,xid:data.xid_code});
  };

  const killXid = async (id) => {
    await supabase.from("xids").update({status:"revoked"}).eq("id",id);
    setShowKill(null);
    setToast("XID killed.");
    if(actXid?.id===id){setView("dashboard");setActConvo(null);setActXid(null);}
    await loadXids(user.id);
  };

  const sendMsg = async (convoId, text) => {
    // Instantly add to local state so it appears without refresh
    const tempMsg = {id:"temp-"+Date.now(),from:"me",sender:null,text,ts:new Date().toISOString()};
    setXids(prev=>prev.map(x=>({...x,conversations:(x.conversations||[]).map(c=>c.id===convoId?{...c,messages:[...(c.messages||[]),tempMsg]}:c)})));
    // Then save to database
    await supabase.from("messages").insert({
      conversation_id:convoId, sender_id:user.id, content:text
    });
  };

  const acceptXid = async (code) => {
    // Find the XID
    const{data:xid}=await supabase.from("xids").select("*").eq("xid_code",code).eq("status","active").single();
    if(!xid){alert("XID not found or inactive.");setShowAccept(false);return;}
    if(xid.user_id===user.id){alert("You can't accept your own XID.");setShowAccept(false);return;}

    // Check connection limit
    if(xid.max_conn !== null && xid.max_conn !== undefined){
      const{count}=await supabase.from("conversations").select("*",{count:"exact",head:true}).eq("xid_id",xid.id);
      if(count>=xid.max_conn){alert("Connection limit reached for this XID ("+count+"/"+xid.max_conn+").");setShowAccept(false);return;}
    }

    // Check if already connected
    const{data:existing}=await supabase.from("conversations").select("*").eq("xid_id",xid.id).eq("participant_id",user.id);
    if(existing&&existing.length>0){
      // Already connected, just open it
      await loadXids(user.id);
      const found=xids.find(x=>x.xid_code===code)||{...xid,xid:xid.xid_code,conversations:[]};
      setActXid(found);
      setView("chat");
      setShowAccept(false);
      setToast("Already connected!");
      return;
    }

    // Create conversation
    const displayName=profile?.name||user.email.split("@")[0];
    const{error}=await supabase.from("conversations").insert({
      xid_id:xid.id, participant_id:user.id, display_name:displayName
    });
    if(error){alert("Error connecting: "+error.message);setShowAccept(false);return;}

    await loadXids(user.id);
    setShowAccept(false);
    setToast("Connected to "+xid.label+"!");
    // Open the XID
    setTimeout(()=>{
      const found=xids.find(x=>x.id===xid.id);
      if(found){setActXid(found);setView("chat");}
    },500);
  };

  const cp = v => {navigator.clipboard?.writeText(v);setToast("Copied!");};
  const openX = (x,c) => {setActXid(x);setActConvo(x.xidType==="group"?(x.conversations[0]||null):(c||x.conversations[0]||null));setView("chat");};
  const totM = x => (x.conversations||[]).reduce((s,c)=>s+(c.messages||[]).length,0);
  const xidMatchSearch = (x,q) => {if(!q)return true;const l=q.toLowerCase();return x.label.toLowerCase().includes(l)||(x.xid||x.xid_code||"").toLowerCase().includes(l)||(x.conversations||[]).some(c=>(c.display_name&&c.display_name.toLowerCase().includes(l))||(c.messages||[]).some(m=>m.text.toLowerCase().includes(l)));};
  const allActive = xids.filter(x=>x.status==="active");
  const allClosed = xids.filter(x=>x.status!=="active");
  const activeL = sideQ.trim() ? allActive.filter(x=>xidMatchSearch(x,sideQ)) : allActive;
  const closedL = sideQ.trim() ? allClosed.filter(x=>xidMatchSearch(x,sideQ)) : allClosed;
  const canCreate = allActive.filter(x=>x.isOwner).length<3;

  if(loading) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#090c11",color:"#63b3ed",fontSize:14}}>Loading...</div>;
  if(!user) return <AuthScreen onLogin={handleLogin}/>;

  return(<div style={S.root}><style>{CSS}</style>
    <nav style={S.side}>
      <div style={S.logoW}><div style={S.logoI}><I.XH/></div><div><div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.04em"}}>XIDgate</div><div style={{fontSize:8.5,color:"#3d4555",letterSpacing:"0.04em"}}>YOU CONTROL THE CONVERSATION</div></div></div>
      <div style={{padding:"4px 12px 8px",display:"flex",gap:6}}>
        <button style={S.sideNewBtn} onClick={()=>canCreate?setView("create"):setShowPricing(true)} onMouseEnter={e=>{e.currentTarget.style.background="#63b3ed";e.currentTarget.style.color="#0a1628";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(99,179,237,0.08)";e.currentTarget.style.color="#63b3ed";}}><I.Plus/> New</button>
        <button style={S.sideAccBtn} onClick={()=>setShowAccept(true)} onMouseEnter={e=>e.currentTarget.style.background="rgba(168,130,255,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(168,130,255,0.05)"}><I.Link/> Accept</button>
      </div>
      <div style={{padding:"0 12px 8px"}}><div style={S.searchB}><I.Search/><input style={S.searchInp} placeholder="Search..." value={sideQ} onChange={e=>setSideQ(e.target.value)}/>{sideQ&&<button style={{color:"#4a5568",fontSize:14}} onClick={()=>setSideQ("")}>x</button>}</div></div>
      <div style={S.navB}>
        <div style={S.navLabel}>ACTIVE</div>
        {activeL.length===0&&<div style={S.navEmpty}>No active XIDs</div>}
        {activeL.map(x=><button key={x.id} style={{...S.navItem,background:actXid?.id===x.id&&view==="chat"?"rgba(99,179,237,0.06)":"transparent",borderLeft:actXid?.id===x.id&&view==="chat"?"2px solid #63b3ed":"2px solid transparent"}} onClick={()=>openX(x)}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:x.xidType==="group"?"#a882ff":"#4a5568",display:"flex"}}>{x.xidType==="group"?<I.Users/>:<I.User/>}</span><span style={{fontSize:12,fontWeight:600,color:"#c8cdd5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</span>{!x.isOwner&&<span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:"rgba(168,130,255,0.1)",color:"#a882ff"}}>joined</span>}</div>
          </div>
          <span style={{fontSize:9,color:"#3d4555"}}>{fmtLeft(x.expires_at)}</span>
        </button>)}
      </div>
      <div style={S.navB}>
        <div style={S.navLabel}>CLOSED</div>
        {closedL.length===0&&<div style={S.navEmpty}>-</div>}
        {closedL.map(x=><button key={x.id} style={{...S.navItem,opacity:0.4}} onClick={()=>openX(x)}>
          <div style={{flex:1,minWidth:0}}><span style={{fontSize:12,color:"#5a6577"}}>{x.label}</span></div>
          <span style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:"rgba(255,255,255,0.04)",color:"#3d4555"}}>{x.status}</span>
        </button>)}
      </div>
      <div style={S.sideFoot}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:24,height:24,borderRadius:6,background:"rgba(99,179,237,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#63b3ed",fontSize:11,fontWeight:700}}>{(profile?.name||"?")[0].toUpperCase()}</div><span style={{fontSize:11,fontWeight:600,color:"#8891a0"}}>{profile?.name||user.email}</span></div>
          <button style={{color:"#4a5568",padding:4}} onClick={handleLogout} title="Sign out"><I.Logout/></button>
        </div>
      </div>
    </nav>

    <main style={S.main}>
      {view==="dashboard"&&<Dash xids={xids} onCreate={()=>canCreate?setView("create"):setShowPricing(true)} onOpen={openX} onCp={cp} onKill={id=>setShowKill(id)} onShare={x=>setShowShare(x)} tm={totM} onAccept={()=>setShowAccept(true)} canCreate={canCreate}/>}
      {view==="create"&&<CreateXID onSubmit={createXid} onCancel={()=>setView("dashboard")}/>}
      {view==="chat"&&actXid&&(()=>{
        const freshXid=xids.find(x=>x.id===actXid.id)||actXid;
        const freshConvo=actConvo?freshXid.conversations?.find(c=>c.id===actConvo.id)||freshXid.conversations?.[0]||null:freshXid.conversations?.[0]||null;
        return <ChatV xid={freshXid} userId={user.id} convo={freshConvo} onSelConvo={setActConvo} onBack={()=>{setView("dashboard");setActXid(null);setActConvo(null);}} onSend={sendMsg} onKill={()=>setShowKill(actXid.id)} onCp={cp} onShare={()=>setShowShare(freshXid)}/>;
      })()}
    </main>

    {showKill&&<div style={S.ov} onClick={()=>setShowKill(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={{width:44,height:44,borderRadius:12,background:"rgba(232,93,93,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#e85d5d",margin:"0 auto 12px"}}><I.Power/></div><h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>Kill this XID?</h3><p style={{fontSize:12,color:"#5a6577",lineHeight:1.6,marginBottom:20}}>All conversations permanently destroyed.</p><div style={{display:"flex",gap:8}}><button style={S.secBtn} onClick={()=>setShowKill(null)}>Cancel</button><button style={{...S.primaryBtn,flex:1,background:"#e85d5d"}} onClick={()=>killXid(showKill)}>Kill XID</button></div></div></div>}
    {showAccept&&<AcceptModal onClose={()=>setShowAccept(false)} onAccept={acceptXid}/>}
    {showPricing&&<PricingScreen onClose={()=>setShowPricing(false)}/>}
    {showShare&&<ShareModal xid={showShare} onClose={()=>setShowShare(null)} onCopy={cp}/>}
    {toast&&<Toast message={toast} onDone={()=>setToast(null)}/>}
  </div>);
}

/* ═══ MODALS ═══ */
function PricingScreen({onClose}){
  return(<div style={S.ov} onClick={onClose}><div style={{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:28,maxWidth:620,width:"95%",position:"relative"}} onClick={e=>e.stopPropagation()}>
    <button style={{position:"absolute",top:14,right:14,fontSize:20,color:"#3d4555"}} onClick={onClose}>x</button>
    <div style={{textAlign:"center",marginBottom:28}}><h2 style={{fontSize:22,fontWeight:800,color:"#fff"}}>Go Unlimited</h2><p style={{fontSize:13,color:"#5a6577",marginTop:4}}>Remove the 3 XID limit.</p></div>
    <div style={{display:"flex",gap:14}}>
      <div style={{flex:1,border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"20px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#5a6577",textTransform:"uppercase",marginBottom:8}}>Free</div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff"}}>$0</div>
        <div style={{fontSize:11,color:"#4a5568",marginBottom:20}}>forever</div>
        {["3 active XIDs","Individual and Group","Text messaging","Kill switch"].map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#8891a0",marginBottom:7}}><I.Check/>{f}</div>)}
        <div style={{width:"100%",padding:9,borderRadius:8,background:"rgba(255,255,255,0.03)",color:"#4a5568",fontSize:12,fontWeight:600,textAlign:"center",marginTop:16}}>Current Plan</div>
      </div>
      <div style={{flex:1,border:"1px solid rgba(99,179,237,0.25)",borderRadius:12,padding:"20px 18px",background:"rgba(99,179,237,0.02)",position:"relative"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#63b3ed",textTransform:"uppercase",marginBottom:8}}>Pro</div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff"}}>Rs 199<span style={{fontSize:13,fontWeight:400,color:"#5a6577"}}>/mo</span></div>
        <div style={{fontSize:11,color:"#4a5568",marginBottom:20}}>billed monthly</div>
        {["Unlimited XIDs","Everything in Free","Priority support","Analytics","API access"].map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#8891a0",marginBottom:7}}><I.Check/>{f}</div>)}
        <button style={{...S.primaryBtn,width:"100%",marginTop:16}} onClick={()=>alert("Razorpay checkout - Rs 199/month")}>Upgrade</button>
      </div>
    </div>
  </div></div>);
}

function AcceptModal({onClose,onAccept}){
  const[code,setCode]=useState("");const[loading,setLoading]=useState(false);
  const go=async()=>{if(!code.trim())return;setLoading(true);await onAccept(code.trim());setLoading(false);};
  return(<div style={S.ov} onClick={onClose}><div style={{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,maxWidth:400,width:"90%"}} onClick={e=>e.stopPropagation()}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(168,130,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#a882ff"}}><I.Link/></div><h3 style={{fontSize:16,fontWeight:700,color:"#fff"}}>Accept an XID</h3></div>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Paste the code someone shared with you.</p>
    <input style={{...S.inp,textAlign:"center",fontSize:16,fontFamily:"monospace",letterSpacing:"0.08em",padding:"14px 16px",border:"1px solid rgba(168,130,255,0.25)",background:"rgba(168,130,255,0.04)"}} placeholder="XID-XXXXXXX" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
    <div style={{display:"flex",gap:8,marginTop:14}}>
      <button style={S.secBtn} onClick={onClose}>Cancel</button>
      <button style={{...S.primaryBtn,flex:1,background:"#a882ff",opacity:code.trim()&&!loading?1:0.35}} onClick={go}>{loading?"Connecting...":<><I.Link/> Connect</>}</button>
    </div>
  </div></div>);
}

function ShareModal({xid,onClose,onCopy}){
  const url=`xidgate.com/x/${xid.xid||xid.xid_code}`;
  return(<div style={S.ov} onClick={onClose}><div style={{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,maxWidth:420,width:"90%"}} onClick={e=>e.stopPropagation()}>
    <h3 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:4}}>Share this XID</h3>
    <p style={{fontSize:12,color:"#5a6577",marginBottom:16}}>Send this code. They connect without seeing your identity.</p>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:9,background:"rgba(99,179,237,0.04)",border:"1px solid rgba(99,179,237,0.1)"}}><code style={{fontSize:20,fontWeight:700,color:"#63b3ed"}}>{xid.xid||xid.xid_code}</code><button style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:5,background:"rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:10,fontWeight:600}} onClick={()=>onCopy(xid.xid||xid.xid_code)}><I.Copy/> Copy</button></div>
    <div style={{display:"flex",gap:8,marginTop:16}}><button style={{...S.secBtn,flex:1}} onClick={onClose}>Done</button></div>
  </div></div>);
}

/* ═══ DASHBOARD ═══ */
function Dash({xids,onCreate,onOpen,onCp,onKill,onShare,tm,onAccept,canCreate}){
  return(<div style={S.dashW}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,gap:16}}>
      <div><h1 style={{fontSize:22,fontWeight:800,color:"#fff"}}>Dashboard</h1><p style={{fontSize:12.5,color:"#4a5568",marginTop:2}}>Your XIDs and conversations</p></div>
      <div style={{display:"flex",gap:6}}>
        <button style={S.dashAccBtn} onClick={onAccept}><I.Link/> Accept</button>
        <button style={S.dashNewBtn} onClick={onCreate} onMouseEnter={e=>{e.currentTarget.style.background="#63b3ed";e.currentTarget.style.color="#0a1628";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(99,179,237,0.08)";e.currentTarget.style.color="#63b3ed";}}><I.Plus/> New XID</button>
      </div>
    </div>
    {xids.length===0?<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 20px",textAlign:"center"}}>
      <div style={{width:52,height:52,borderRadius:14,background:"rgba(99,179,237,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:"#63b3ed",marginBottom:16}}><I.Shield/></div>
      <h3 style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:6}}>Your conversations, your rules</h3>
      <p style={{fontSize:13,color:"#4a5568",maxWidth:380,lineHeight:1.6,marginBottom:20}}>Create an XID to chat without sharing personal info. Or accept an XID someone shared with you.</p>
      <div style={{display:"flex",gap:8}}><button style={S.primaryBtn} onClick={onCreate}><I.Plus/> Create XID</button><button style={{padding:"10px 18px",borderRadius:9,border:"1px solid rgba(168,130,255,0.2)",color:"#a882ff",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}} onClick={onAccept}><I.Link/> Accept XID</button></div>
    </div>
    :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:10}}>{xids.map((x,i)=><Card key={x.id} x={x} i={i} onOpen={c=>onOpen(x,c)} onCp={()=>onCp(x.xid||x.xid_code)} onKill={()=>onKill(x.id)} onShare={()=>onShare(x)} tm={tm(x)}/>)}</div>}
  </div>);
}

/* ═══ CARD ═══ */
function Card({x,i,onOpen,onCp,onKill,onShare,tm}){
  const act=x.status==="active",isG=x.xidType==="group";
  return(<div style={{background:"rgba(255,255,255,0.015)",border:"1px solid",borderColor:act?"rgba(99,179,237,0.1)":"rgba(255,255,255,0.03)",borderRadius:12,padding:14,position:"relative",overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,display:"flex",alignItems:"center",gap:3,background:isG?"rgba(168,130,255,0.1)":"rgba(99,179,237,0.08)",color:isG?"#a882ff":"#63b3ed"}}>{isG?<><I.Users/> GRP</>:<><I.User/> 1:1</>}</span>
          <span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:act?"rgba(72,187,120,0.1)":"rgba(255,255,255,0.04)",color:act?"#48bb78":x.status==="revoked"?"#e85d5d":"#4a5568"}}>{act?"Live":x.status}</span>
          {!x.isOwner&&<span style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:"rgba(168,130,255,0.08)",color:"#a882ff"}}>joined</span>}
        </div>
        <h3 style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{x.label}</h3>
      </div>
      {act&&x.isOwner&&<button style={{padding:6,borderRadius:6,background:"rgba(99,179,237,0.05)",color:"#63b3ed"}} onClick={e=>{e.stopPropagation();onShare();}}><I.Share/></button>}
    </div>
    <button style={S.xidCodeBtn} onClick={e=>{e.stopPropagation();onCp();}}><code>{x.xid||x.xid_code}</code><I.Copy/></button>
    <div style={{display:"flex",gap:8,marginBottom:8}}><span style={S.metaTag}><I.Clock/>{fmtLeft(x.expires_at)}</span><span style={S.metaTag}><I.Chat/>{tm} msgs</span><span style={S.metaTag}>{(x.conversations||[]).length} connected</span></div>
    <div style={{display:"flex",gap:6,marginTop:4}}>
      <button style={S.cardBtn} onClick={()=>onOpen(null)} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}><I.Chat/>{act?"Open":"View"}</button>
      {act&&x.isOwner&&<button style={S.cardKillBtn} onClick={e=>{e.stopPropagation();onKill();}} onMouseEnter={e=>e.currentTarget.style.background="rgba(232,93,93,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(232,93,93,0.05)"}><I.Trash/></button>}
    </div>
  </div>);
}

/* ═══ CREATE ═══ */
function CreateXID({onSubmit,onCancel}){
  const[label,setLabel]=useState("");const[xidType,setXT]=useState("individual");const[dur,setDur]=useState("24h");const[ah,setAH]=useState("any");
  const[mcMode,setMCMode]=useState("unlimited"); // "unlimited" or "limit"
  const[mcVal,setMCVal]=useState("");
  const[mmMode,setMMMode]=useState("unlimited");
  const[mmVal,setMMVal]=useState("");
  const[loading,setLoading]=useState(false);
  const go=async()=>{if(!label.trim()||loading)return;setLoading(true);await onSubmit({label:label.trim(),xidType,duration:dur,activeHours:ah,maxConn:mcMode==="unlimited"?"":mcVal,maxMsgs:mmMode==="unlimited"?"":mmVal});setLoading(false);};
  return(<div style={{flex:1,overflowY:"auto",padding:"24px 32px"}}>
    <button style={S.backBtn} onClick={onCancel}><I.Back/> Dashboard</button>
    <div style={{maxWidth:540}}>
      <h2 style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>New XID</h2>
      <p style={{fontSize:12.5,color:"#4a5568",marginBottom:24}}>Set the rules. Share the code. You are in control.</p>
      <div style={S.formSection}><label style={S.fLabel}>What is this for?</label><input style={S.inp} placeholder='e.g. "OLX Sofa Buyer"' value={label} onChange={e=>setLabel(e.target.value)} autoFocus/></div>
      <div style={S.formSection}><label style={S.fLabel}>Type</label><div style={{display:"flex",gap:8}}>
        <button style={{...S.typeBtn,borderColor:xidType==="individual"?"rgba(99,179,237,0.35)":"rgba(255,255,255,0.06)",background:xidType==="individual"?"rgba(99,179,237,0.06)":"transparent"}} onClick={()=>setXT("individual")}><div style={{color:xidType==="individual"?"#63b3ed":"#4a5568",marginBottom:4}}><I.User/></div><div style={{fontSize:12,fontWeight:600,color:xidType==="individual"?"#c8cdd5":"#5a6577"}}>Individual</div><div style={{fontSize:10,color:"#4a5568",marginTop:2}}>Separate chat per person</div></button>
        <button style={{...S.typeBtn,borderColor:xidType==="group"?"rgba(168,130,255,0.35)":"rgba(255,255,255,0.06)",background:xidType==="group"?"rgba(168,130,255,0.06)":"transparent"}} onClick={()=>setXT("group")}><div style={{color:xidType==="group"?"#a882ff":"#4a5568",marginBottom:4}}><I.Users/></div><div style={{fontSize:12,fontWeight:600,color:xidType==="group"?"#c8cdd5":"#5a6577"}}>Group</div><div style={{fontSize:10,color:"#4a5568",marginTop:2}}>Everyone in one chat</div></button>
      </div></div>
      <div style={{display:"flex",gap:12,...S.formSection}}><div style={{flex:1}}><label style={S.fLabel}>Expires After</label><Sel options={durOpts} value={dur} onChange={setDur}/></div><div style={{flex:1}}><label style={S.fLabel}>Active Hours</label><Sel options={ahOpts} value={ah} onChange={setAH}/></div></div>
      <div style={{display:"flex",gap:12,...S.formSection}}>
        <div style={{flex:1}}>
          <label style={S.fLabel}>Connection Limit</label>
          <div style={{display:"flex",gap:5,marginBottom:4}}>
            <button style={{...S.toggleBtn,background:mcMode==="unlimited"?"rgba(99,179,237,0.1)":"transparent",color:mcMode==="unlimited"?"#63b3ed":"#4a5568",borderColor:mcMode==="unlimited"?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>{setMCMode("unlimited");setMCVal("");}}>Unlimited</button>
            <button style={{...S.toggleBtn,background:mcMode==="limit"?"rgba(99,179,237,0.1)":"transparent",color:mcMode==="limit"?"#63b3ed":"#4a5568",borderColor:mcMode==="limit"?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>setMCMode("limit")}>Limit</button>
          </div>
          {mcMode==="limit"&&<input style={S.inp} placeholder="Enter number (e.g. 5)" value={mcVal} onChange={e=>setMCVal(e.target.value.replace(/[^0-9]/g,""))}/>}
          {mcMode==="limit"&&<p style={{fontSize:10,color:"#4a5568",marginTop:4}}>{mcVal?`Max ${mcVal} connections`:"Enter a number"}</p>}
        </div>
        <div style={{flex:1}}>
          <label style={S.fLabel}>Max Messages</label>
          <div style={{display:"flex",gap:5,marginBottom:4}}>
            <button style={{...S.toggleBtn,background:mmMode==="unlimited"?"rgba(99,179,237,0.1)":"transparent",color:mmMode==="unlimited"?"#63b3ed":"#4a5568",borderColor:mmMode==="unlimited"?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>{setMMMode("unlimited");setMMVal("");}}>Unlimited</button>
            <button style={{...S.toggleBtn,background:mmMode==="limit"?"rgba(99,179,237,0.1)":"transparent",color:mmMode==="limit"?"#63b3ed":"#4a5568",borderColor:mmMode==="limit"?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.06)"}} onClick={()=>setMMMode("limit")}>Limit</button>
          </div>
          {mmMode==="limit"&&<input style={S.inp} placeholder="Enter number (e.g. 50)" value={mmVal} onChange={e=>setMMVal(e.target.value.replace(/[^0-9]/g,""))}/>}
          {mmMode==="limit"&&<p style={{fontSize:10,color:"#4a5568",marginTop:4}}>{mmVal?`Max ${mmVal} messages`:"Enter a number"}</p>}
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button style={S.secBtn} onClick={onCancel}>Cancel</button><button style={{...S.primaryBtn,opacity:label.trim()&&!loading?1:0.35}} onClick={go}>{loading?"Creating...":<><I.Plus/> Create XID</>}</button></div>
    </div>
  </div>);
}

/* ═══ CHAT ═══ */
function ChatV({xid:x,userId,convo,onSelConvo,onBack,onSend,onKill,onCp,onShare}){
  const[input,setInput]=useState("");const[sending,setSending]=useState(false);const endRef=useRef(null);
  const act=x.status==="active",isG=x.xidType==="group",cur=convo||x.conversations[0]||null;
  const totM=(x.conversations||[]).reduce((s,c)=>s+(c.messages||[]).length,0);
  const atLim=x.maxMsgs!=null&&totM>=x.maxMsgs;
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[cur?.messages]);
  const doSend=async()=>{if(!input.trim()||!act||atLim||!cur||sending)return;setSending(true);await onSend(cur.id,input.trim());setInput("");setSending(false);};

  return(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
      <button style={{color:"#5a6577",padding:4}} onClick={onBack}><I.Back/></button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.label}</h3>
          <span style={{fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:3,background:isG?"rgba(168,130,255,0.1)":"rgba(99,179,237,0.08)",color:isG?"#a882ff":"#63b3ed"}}>{isG?"GRP":"1:1"}</span>
          <span style={{width:6,height:6,borderRadius:"50%",background:act?"#48bb78":"#e85d5d"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#3d4555",marginTop:2}}>
          <span>{x.xid||x.xid_code}</span><span>-</span><span>{fmtLeft(x.expires_at)}</span><span>-</span><span>{(x.conversations||[]).length} connected</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6}}>
        {act&&x.isOwner&&<button style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:600,color:"#8891a0"}} onClick={onShare}><I.Share/></button>}
        {act&&x.isOwner&&<button style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:600,color:"#e85d5d"}} onClick={onKill}>Kill</button>}
      </div>
    </div>
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {!isG&&(x.conversations||[]).length>1&&<div style={{width:180,borderRight:"1px solid rgba(255,255,255,0.04)",overflowY:"auto"}}>
        <div style={{padding:"8px 10px 4px",fontSize:9,fontWeight:700,color:"#2d3748",textTransform:"uppercase"}}>Threads</div>
        {(x.conversations||[]).map(c=><button key={c.id} style={{width:"100%",padding:"7px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:cur?.id===c.id?"#c8cdd5":"#5a6577",textAlign:"left",background:cur?.id===c.id?"rgba(99,179,237,0.06)":"transparent",borderLeft:cur?.id===c.id?"2px solid #63b3ed":"2px solid transparent"}} onClick={()=>onSelConvo(c)}><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{c.display_name}</span><span style={{fontSize:9,color:"#3d4555"}}>{(c.messages||[]).length}</span></button>)}
      </div>}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:8,background:"rgba(99,179,237,0.025)",border:"1px solid rgba(99,179,237,0.05)",fontSize:10,color:"#3d4555",marginBottom:14}}><I.Shield/><span>Protected by XIDgate. No personal info exchanged.</span></div>
          {cur&&(cur.messages||[]).length>0?(cur.messages||[]).map(m=><div key={m.id} style={{display:"flex",marginBottom:6,justifyContent:m.from==="me"?"flex-end":"flex-start"}}><div style={{maxWidth:"75%",padding:"8px 12px",borderRadius:m.from==="me"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:m.from==="me"?"rgba(99,179,237,0.1)":"rgba(255,255,255,0.04)",color:m.from==="me"?"#c8ddf0":"#b0b8c4"}}>{m.from!=="me"&&m.sender&&<div style={{fontSize:9,fontWeight:700,color:isG?"#a882ff":"#63b3ed",marginBottom:2}}>{m.sender}</div>}<div style={{fontSize:13,lineHeight:1.5}}>{m.text}</div><div style={{fontSize:8.5,color:"#2d3748",marginTop:3,textAlign:"right"}}>{timeFull(m.ts)}</div></div></div>):<div style={{textAlign:"center",padding:50,color:"#2d3748",fontSize:13}}>{cur?"No messages yet. Say hello!":"Waiting for connections."}</div>}
          <div ref={endRef}/>
        </div>
        {act?(atLim?<div style={S.closedBar}><I.Chat/> Message limit reached.</div>:cur?<div style={S.inputBar}><input style={S.chatInput} placeholder={isG?"Message the group...":`Type a message...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSend()}/><button style={{...S.sendBtn,opacity:input.trim()&&!sending?1:0.2}} onClick={doSend}><I.Send/></button></div>:<div style={S.closedBar}><I.Globe/> Share your XID code to start.</div>):<div style={S.closedBar}><I.Lock/> This XID is {x.status}.</div>}
      </div>
    </div>
  </div>);
}

/* ═══ CSS ═══ */
const CSS=`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05);border-radius:2px}input:focus{outline:none;border-color:rgba(99,179,237,0.3)!important}button{cursor:pointer;border:none;background:none;font-family:inherit}button:active{transform:scale(0.97)}::selection{background:rgba(99,179,237,0.25)}@keyframes toastIn{from{transform:translateY(20px) translateX(-50%);opacity:0}to{transform:translateY(0) translateX(-50%);opacity:1}}`;

const S={
root:{display:"flex",height:"100vh",background:"#090c11",color:"#c8cdd5",fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:"hidden"},
side:{width:260,borderRight:"1px solid rgba(255,255,255,0.04)",display:"flex",flexDirection:"column",background:"#070a0f",flexShrink:0},
logoW:{display:"flex",alignItems:"center",gap:10,padding:"18px 14px 12px"},
logoI:{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#63b3ed,#3182ce)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"},
sideNewBtn:{flex:1,padding:"8px",borderRadius:8,background:"rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.15s",border:"1px solid rgba(99,179,237,0.15)"},
sideAccBtn:{flex:1,padding:"8px",borderRadius:8,background:"rgba(168,130,255,0.05)",color:"#a882ff",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.15s",border:"1px solid rgba(168,130,255,0.12)"},
searchB:{display:"flex",alignItems:"center",gap:6,padding:"6px 9px",borderRadius:7,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.04)",color:"#3d4555"},
searchInp:{flex:1,background:"transparent",border:"none",color:"#c8cdd5",fontSize:11.5,outline:"none"},
navB:{padding:"2px 0",flex:1,overflowY:"auto"},
navLabel:{fontSize:8.5,fontWeight:700,letterSpacing:"0.12em",color:"#2d3748",padding:"8px 14px 4px"},
navEmpty:{padding:"6px 14px",fontSize:10.5,color:"#1e2533",fontStyle:"italic"},
navItem:{width:"100%",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,transition:"all 0.12s",textAlign:"left"},
sideFoot:{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.04)"},
main:{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"},
dashW:{flex:1,overflowY:"auto",padding:"24px 28px"},
dashNewBtn:{padding:"8px 14px",borderRadius:8,background:"rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,transition:"all 0.15s",border:"1px solid rgba(99,179,237,0.15)"},
dashAccBtn:{padding:"8px 14px",borderRadius:8,border:"1px solid rgba(168,130,255,0.12)",color:"#a882ff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5},
xidCodeBtn:{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 7px",borderRadius:4,background:"rgba(99,179,237,0.05)",border:"1px solid rgba(99,179,237,0.08)",color:"#63b3ed",fontSize:10.5,cursor:"pointer",marginBottom:8,fontFamily:"monospace"},
metaTag:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,color:"#3d4555",padding:"2px 6px",borderRadius:3,background:"rgba(255,255,255,0.02)"},
cardBtn:{flex:1,padding:"7px",borderRadius:7,background:"rgba(255,255,255,0.03)",color:"#8891a0",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.12s"},
cardKillBtn:{padding:"7px 9px",borderRadius:7,background:"rgba(232,93,93,0.05)",color:"#e85d5d",transition:"all 0.12s"},
formSection:{marginBottom:18},
fLabel:{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#4a5568",marginBottom:6,display:"block"},
inp:{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",color:"#e2e8f0",fontSize:13.5,fontFamily:"'Plus Jakarta Sans',sans-serif",display:"block"},
typeBtn:{flex:1,padding:"14px 12px",borderRadius:10,border:"1px solid",textAlign:"center",transition:"all 0.15s",cursor:"pointer"},
toggleBtn:{flex:1,padding:"7px",borderRadius:7,border:"1px solid",fontSize:11.5,fontWeight:700,textAlign:"center",transition:"all 0.12s"},
backBtn:{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#4a5568",marginBottom:18,fontWeight:500},
primaryBtn:{padding:"10px 18px",borderRadius:9,background:"#63b3ed",color:"#0a1628",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6},
secBtn:{flex:1,padding:"10px",borderRadius:9,background:"rgba(255,255,255,0.04)",color:"#8891a0",fontSize:12.5,fontWeight:600},
selTr:{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"},
selDr:{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:"#111520",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:3,zIndex:50,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 30px rgba(0,0,0,0.5)"},
selOp:{width:"100%",padding:"7px 10px",borderRadius:5,fontSize:12,textAlign:"left"},
inputBar:{display:"flex",gap:7,padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",alignItems:"center"},
chatInput:{flex:1,padding:"10px 12px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",color:"#e2e8f0",fontSize:13},
sendBtn:{width:38,height:38,borderRadius:9,background:"#63b3ed",color:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
closedBar:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:11.5,color:"#2d3748"},
ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
modal:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,maxWidth:380,width:"90%"},
toast:{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",color:"#63b3ed",padding:"10px 20px",borderRadius:10,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:7,zIndex:9999,animation:"toastIn 0.3s ease",boxShadow:"0 8px 30px rgba(0,0,0,0.4)"},
authBg:{width:"100%",height:"100vh",background:"#070a0f",display:"flex",alignItems:"center",justifyContent:"center"},
authCard:{background:"#0f1219",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"36px 32px",width:380},
};

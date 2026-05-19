import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EXP_CATS = [
  {id:"food",     label:"Food & Drink", icon:"🍽️", color:"#f97316"},
  {id:"transport",label:"Transport",    icon:"🚗",  color:"#3b82f6"},
  {id:"shopping", label:"Shopping",     icon:"🛍️", color:"#8b5cf6"},
  {id:"health",   label:"Health",       icon:"💊",  color:"#10b981"},
  {id:"bills",    label:"Bills",        icon:"🧾",  color:"#6366f1"},
  {id:"social",   label:"Social",       icon:"🎉",  color:"#ec4899"},
  {id:"edu",      label:"Education",    icon:"📚",  color:"#f59e0b"},
  {id:"other",    label:"Other",        icon:"💳",  color:"#6b7280"},
];

const MOODS = [
  {v:"great",e:"😄",label:"Great",c:"#10b981"},
  {v:"good", e:"🙂",label:"Good", c:"#6366f1"},
  {v:"okay", e:"😐",label:"Okay", c:"#f59e0b"},
  {v:"low",  e:"😔",label:"Low",  c:"#f97316"},
  {v:"bad",  e:"😞",label:"Bad",  c:"#ef4444"},
];

const TASK_CATS = ["Work","Health","Learning","Personal","Finance","Home","Other"];

const QUOTES = [
  ["Focus on progress, not perfection.","Unknown"],
  ["Small steps every day lead to big results.","Unknown"],
  ["Don't watch the clock; do what it does.","Sam Levenson"],
  ["The secret of getting ahead is getting started.","Mark Twain"],
  ["Your future is created by what you do today.","R. Kiyosaki"],
  ["Discipline is the bridge between goals and accomplishment.","Jim Rohn"],
  ["Today's actions are tomorrow's results.","Unknown"],
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtKey(k) {
  const [y,m,d] = k.split("-");
  const dt = new Date(+y,+m-1,+d);
  return `${DAYS[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}
function past7() {
  return Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function currMonthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function useLS(key, init) {
  const [v, setV] = useState(() => {
    try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; }
  });
  const set = useCallback((updater) => {
    setV(prev => {
      const next = typeof updater==="function" ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [v, set];
}

function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",background:"var(--card)",borderRadius:"20px 20px 0 0",maxHeight:"88vh",overflowY:"auto",animation:"slideUp .25s cubic-bezier(.4,0,.2,1)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"var(--border)"}}/>
        </div>
        {title && <div style={{padding:"8px 20px 14px",fontWeight:700,fontSize:17,color:"var(--text)"}}>{title}</div>}
        <div style={{padding:"0 20px 32px"}}>{children}</div>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, color="#6366f1" }) {
  return (
    <div onClick={onChange} style={{width:22,height:22,borderRadius:6,flexShrink:0,cursor:"pointer",border:`2px solid ${checked?color:"var(--border)"}`,background:checked?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .18s"}}>
      {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

function Pill({ label, color }) {
  return <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,background:color+"18",color,letterSpacing:.3,flexShrink:0}}>{label}</span>;
}

function Ring({ pct, size=72, stroke=7, color="#6366f1", children }) {
  const r=(size-stroke*2)/2, circ=2*Math.PI*r;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .5s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      {label && <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:6,letterSpacing:.3,textTransform:"uppercase"}}>{label}</div>}
      {children}
    </div>
  );
}

export default function App() {
  const [dark,     setDark]     = useLS("df_dark",  false);
  const [tab,      setTab]      = useState("today");
  const [tasks,    setTasks]    = useLS("df_tasks", [
    {id:1,text:"Morning workout",cat:"Health",  type:"regular"},
    {id:2,text:"Read 30 minutes",cat:"Learning",type:"regular"},
    {id:3,text:"Check emails",   cat:"Work",    type:"regular"},
  ]);
  const [dayData,  setDayData]  = useLS("df_day",   {});
  const [expenses, setExpenses] = useLS("df_exp",   []);
  const [notes,    setNotes]    = useLS("df_notes", []);
  const [reminder, setReminder] = useLS("df_rem",   {active:false,hrs:1,label:""});
  const remRef = useRef(null);

  const [sheet,    setSheet]    = useState(null);
  const [taskForm, setTaskForm] = useState({text:"",cat:"Work",type:"regular"});
  const [expForm,  setExpForm]  = useState({amount:"",desc:"",cat:"food",date:todayKey(),note:""});
  const [noteForm, setNoteForm] = useState({title:"",text:""});
  const [remHrs,   setRemHrs]   = useState(1);
  const [remLabel, setRemLabel] = useState("");

  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const EMPTY = {checks:{},mood:"",note:"",extra:[],special:[]};
  const getDay   = useCallback(k => dayData[k]||EMPTY, [dayData]);
  const patchDay = useCallback((k,patch) => {
    setDayData(prev => ({...prev,[k]:{...(prev[k]||EMPTY),...patch}}));
  },[setDayData]);

  const tk    = todayKey();
  const today = getDay(tk);
  const reg   = tasks.filter(t=>t.type==="regular");

  function calcPct(k) {
    const d=getDay(k);
    const total=reg.length+(d.extra||[]).length+(d.special||[]).length;
    if(!total) return 0;
    const done=reg.filter(t=>d.checks?.[t.id]).length+(d.extra||[]).filter(x=>x.done).length+(d.special||[]).filter(x=>x.done).length;
    return Math.round((done/total)*100);
  }

  const todayPct   = calcPct(tk);
  const totalToday = reg.length+(today.extra||[]).length+(today.special||[]).length;
  const doneToday  = reg.filter(t=>today.checks?.[t.id]).length+(today.extra||[]).filter(x=>x.done).length+(today.special||[]).filter(x=>x.done).length;

  function addExp() {
    if(!expForm.amount||!expForm.desc.trim()) return;
    setExpenses(p=>[{...expForm,id:Date.now(),amount:+expForm.amount},...p]);
    setExpForm({amount:"",desc:"",cat:"food",date:todayKey(),note:""});
    setSheet(null);
  }

  const monthPfx   = currMonthPrefix();
  const monthExp   = expenses.filter(e=>e.date.startsWith(monthPfx));
  const totalMonth = monthExp.reduce((s,e)=>s+e.amount,0);
  const todayExp   = expenses.filter(e=>e.date===tk).reduce((s,e)=>s+e.amount,0);
  const expByCat   = EXP_CATS.map(c=>({...c,total:monthExp.filter(e=>e.cat===c.id).reduce((s,e)=>s+e.amount,0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const days7      = past7();
  const expTrend   = days7.map(k=>({label:k.slice(5),amt:expenses.filter(e=>e.date===k).reduce((s,e)=>s+e.amount,0)}));
  const taskTrend  = days7.map(k=>({label:k.slice(5),pct:calcPct(k)}));

  function startReminder() {
    if(remRef.current) clearTimeout(remRef.current);
    remRef.current=setTimeout(()=>{alert(`⏰ ${remLabel||"Check your tasks!"}`);setReminder(r=>({...r,active:false}));},remHrs*3600*1000);
    setReminder({active:true,hrs:remHrs,label:remLabel});
    setSheet(null);
  }
  function cancelReminder() {
    if(remRef.current) clearTimeout(remRef.current);
    setReminder({active:false,hrs:1,label:""});
  }

  const bg     = dark?"#0d0d0f":"#f2f2f7";
  const card   = dark?"#1c1c1e":"#ffffff";
  const text   = dark?"#f2f2f7":"#1c1c1e";
  const muted  = "#8e8e93";
  const border = dark?"rgba(255,255,255,0.09)":"rgba(0,0,0,0.08)";
  const inp    = dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)";

  const pctColor = p => p>=80?"#10b981":p>=50?"#6366f1":"#f59e0b";
  const catColor = id => (EXP_CATS.find(c=>c.id===id)||{color:"#888"}).color;
  const catIcon  = id => (EXP_CATS.find(c=>c.id===id)||{icon:"💳"}).icon;
  const catLabel = id => (EXP_CATS.find(c=>c.id===id)||{label:"Other"}).label;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    :root{--bg:${bg};--card:${card};--text:${text};--muted:${muted};--border:${border};--inp:${inp};--accent:#6366f1}
    html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;font-size:15px;line-height:1.5;max-width:430px;margin:0 auto;min-height:100vh}
    input,select,textarea{background:var(--inp);border:1.5px solid var(--border);border-radius:12px;color:var(--text);padding:12px 14px;font-size:15px;width:100%;outline:none;font-family:inherit;transition:border .15s;-webkit-appearance:none}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)}
    textarea{resize:vertical}
    button{cursor:pointer;font-family:inherit;border:none;outline:none;background:none}
    .card{background:var(--card);border-radius:18px;padding:16px}
    .sec{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px}
    .btn-p{background:var(--accent);color:#fff;border-radius:14px;padding:14px;font-size:15px;font-weight:600;width:100%}
    .btn-p:active{opacity:.85}
    .dash-btn{background:var(--card);border:1.5px dashed var(--border);border-radius:14px;padding:13px;font-size:13px;font-weight:600;color:var(--muted);display:flex;align-items:center;justify-content:center;gap:6px;width:100%}
    ::-webkit-scrollbar{display:none}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    .fade{animation:fadeIn .3s ease}
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{paddingBottom:80}}>

        {/* Header */}
        <div style={{padding:"52px 20px 0",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,color:muted,fontWeight:500}}>{fmtKey(tk)}</div>
            <div style={{fontSize:25,fontWeight:700,marginTop:2,letterSpacing:-.5}}>{getGreeting()} 👋</div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {reminder.active && (
              <div style={{background:"#6366f115",border:"1px solid #6366f140",borderRadius:12,padding:"6px 10px",fontSize:13,fontWeight:600,color:"#6366f1",display:"flex",alignItems:"center",gap:4}}>
                ⏰ {reminder.hrs}hr
                <button onClick={cancelReminder} style={{color:muted,fontSize:15,paddingLeft:2}}>×</button>
              </div>
            )}
            <button onClick={()=>setDark(d=>!d)} style={{background:card,border:`1px solid ${border}`,borderRadius:12,width:36,height:36,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {dark?"☀️":"🌙"}
            </button>
          </div>
        </div>

        {/* Quote */}
        <div style={{padding:"14px 20px 0"}}>
          <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:16,padding:"12px 16px"}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.9)",fontStyle:"italic",lineHeight:1.6}}>"{quote[0]}"</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:4}}>— {quote[1]}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{padding:"14px 20px 0",display:"flex",gap:6}}>
          {[["today","Today"],["stats","Stats"],["expenses","Wallet"],["notes","Notes"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 4px",borderRadius:12,fontSize:13,fontWeight:600,background:tab===id?"var(--accent)":card,color:tab===id?"#fff":muted,border:`1px solid ${tab===id?"transparent":border}`,transition:"all .2s"}}>
              {label}
            </button>
          ))}
        </div>

        <div style={{padding:"14px 20px 0"}} className="fade" key={tab}>

          {/* ── TODAY ─────────────────────────────────────────────────── */}
          {tab==="today" && (
            <>
              {/* Progress ring card */}
              <div className="card" style={{display:"flex",gap:16,alignItems:"center",marginBottom:12}}>
                <Ring pct={todayPct} size={72} stroke={7} color={pctColor(todayPct)}>
                  <span style={{fontSize:15,fontWeight:700,color:pctColor(todayPct)}}>{todayPct}%</span>
                </Ring>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:700}}>{doneToday}/{totalToday} tasks done</div>
                  <div style={{fontSize:13,color:muted,marginTop:2}}>
                    {todayPct===100?"All done! Great work 🎉":todayPct>=50?"Keep going, halfway there!":"Let's get started 💪"}
                  </div>
                  <div style={{marginTop:10,height:5,background:border,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${todayPct}%`,background:pctColor(todayPct),borderRadius:99,transition:"width .5s ease"}}/>
                  </div>
                </div>
              </div>

              {/* Mood */}
              <div className="card" style={{marginBottom:12}}>
                <div className="sec">How are you feeling?</div>
                <div style={{display:"flex",gap:6}}>
                  {MOODS.map(m=>(
                    <button key={m.v} onClick={()=>patchDay(tk,{mood:m.v})} style={{flex:1,padding:"10px 0",borderRadius:12,fontSize:22,background:today.mood===m.v?m.c+"22":inp,border:`1.5px solid ${today.mood===m.v?m.c:border}`,transition:"all .18s"}}>
                      {m.e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily tasks */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div className="sec" style={{margin:0}}>Daily tasks</div>
                  <button onClick={()=>{setTaskForm({text:"",cat:"Work",type:"regular"});setSheet("addTask");}} style={{background:"var(--accent)",color:"#fff",borderRadius:10,padding:"6px 14px",fontSize:13,fontWeight:600}}>+ Add</button>
                </div>
                {reg.length===0 && <div style={{textAlign:"center",padding:"18px 0",color:muted,fontSize:14}}>No tasks yet. Add your first one!</div>}
                {reg.map((t,i)=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<reg.length-1?`1px solid ${border}`:"none"}}>
                    <Checkbox checked={!!today.checks?.[t.id]} onChange={()=>patchDay(tk,{checks:{...today.checks,[t.id]:!today.checks?.[t.id]}})}/>
                    <span style={{flex:1,fontSize:15,textDecoration:today.checks?.[t.id]?"line-through":"none",color:today.checks?.[t.id]?muted:text,transition:"all .2s"}}>{t.text}</span>
                    <Pill label={t.cat} color="#6366f1"/>
                    <button onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))} style={{color:muted,fontSize:18,padding:4}}>×</button>
                  </div>
                ))}
              </div>

              {/* Extra tasks */}
              {(today.extra||[]).length>0 && (
                <div className="card" style={{marginBottom:12}}>
                  <div className="sec">Extra tasks today</div>
                  {(today.extra||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<today.extra.length-1?`1px solid ${border}`:"none"}}>
                      <Checkbox checked={t.done} color="#06b6d4" onChange={()=>{const a=[...today.extra];a[i]={...a[i],done:!a[i].done};patchDay(tk,{extra:a});}}/>
                      <span style={{flex:1,fontSize:15,textDecoration:t.done?"line-through":"none",color:t.done?muted:text}}>{t.text}</span>
                      <Pill label="Extra" color="#06b6d4"/>
                    </div>
                  ))}
                </div>
              )}

              {/* Special tasks */}
              {(today.special||[]).length>0 && (
                <div className="card" style={{marginBottom:12}}>
                  <div className="sec">⭐ Priority tasks</div>
                  {(today.special||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<today.special.length-1?`1px solid ${border}`:"none"}}>
                      <Checkbox checked={t.done} color="#ef4444" onChange={()=>{const a=[...today.special];a[i]={...a[i],done:!a[i].done};patchDay(tk,{special:a});}}/>
                      <span style={{flex:1,fontSize:15,textDecoration:t.done?"line-through":"none",color:t.done?muted:text}}>{t.text}</span>
                      <Pill label="Priority" color="#ef4444"/>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <button className="dash-btn" onClick={()=>{setTaskForm({text:"",cat:"Work",type:"extra"});setSheet("addTask");}}>+ Extra task</button>
                <button onClick={()=>{setTaskForm({text:"",cat:"Work",type:"special"});setSheet("addTask");}} style={{background:card,border:"1.5px dashed #ef444440",borderRadius:14,padding:"13px",fontSize:13,fontWeight:600,color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>⭐ Priority task</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button className="dash-btn" onClick={()=>setSheet("dayNote")}>📝 Day note {today.note?"✓":""}</button>
                <button onClick={()=>setSheet("reminder")} style={{background:reminder.active?"#6366f110":card,border:`1px solid ${reminder.active?"#6366f1":border}`,borderRadius:14,padding:"13px",fontSize:13,fontWeight:600,color:reminder.active?"#6366f1":muted,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  ⏰ {reminder.active?`${reminder.hrs}hr set`:"Reminder"}
                </button>
              </div>
            </>
          )}

          {/* ── STATS ─────────────────────────────────────────────────── */}
          {tab==="stats" && (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {[
                  {label:"7-day avg",val:Math.round(taskTrend.reduce((s,d)=>s+d.pct,0)/7)+"%",sub:"completion",color:"#6366f1"},
                  {label:"Best day", val:taskTrend.reduce((a,c)=>c.pct>a.pct?c:a,taskTrend[0]).pct+"%",sub:"peak",color:"#10b981"},
                  {label:"Today",    val:"₹"+todayExp.toLocaleString(),sub:"spent today",color:"#f97316"},
                  {label:"Month",    val:"₹"+totalMonth.toLocaleString(),sub:"total",color:"#ef4444"},
                ].map(s=>(
                  <div key={s.label} className="card">
                    <div style={{fontSize:11,color:muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>{s.label}</div>
                    <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:12,color:muted,marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{marginBottom:12}}>
                <div className="sec">7-day completion</div>
                <ResponsiveContainer width="100%" height={155}>
                  <AreaChart data={taskTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                    <XAxis dataKey="label" tick={{fontSize:11,fill:muted}} tickLine={false} axisLine={false}/>
                    <YAxis domain={[0,100]} tick={{fontSize:11,fill:muted}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{background:card,border:`1px solid ${border}`,borderRadius:10,fontSize:12,color:text}} formatter={v=>[v+"%","Done"]}/>
                    <Area type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2} fill="url(#g1)" dot={{fill:"#6366f1",r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{marginBottom:12}}>
                <div className="sec">Mood this week</div>
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:4}}>
                  {days7.map(k=>{
                    const mo=MOODS.find(x=>x.v===getDay(k).mood);
                    return (
                      <div key={k} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <span style={{fontSize:22}}>{mo?mo.e:"—"}</span>
                        <span style={{fontSize:10,color:muted}}>{k.slice(8)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="sec">Daily log</div>
                {days7.slice().reverse().map(k=>{
                  const p=calcPct(k), mo=MOODS.find(x=>x.v===getDay(k).mood);
                  return (
                    <div key={k} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${border}`}}>
                      <Ring pct={p} size={44} stroke={4} color={pctColor(p)}>
                        <span style={{fontSize:9,fontWeight:700,color:pctColor(p)}}>{p}%</span>
                      </Ring>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600}}>{fmtKey(k)}{k===tk?" · Today":""}</div>
                        <div style={{fontSize:12,color:muted,marginTop:1}}>{mo?mo.e+" "+mo.label:"No mood"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── WALLET ────────────────────────────────────────────────── */}
          {tab==="expenses" && (
            <>
              <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:20,padding:"20px",marginBottom:12}}>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",fontWeight:500}}>This month</div>
                <div style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:-1.5,margin:"6px 0 4px"}}>₹{totalMonth.toLocaleString()}</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>{monthExp.length} transactions</div>
                <div style={{display:"flex",gap:20,marginTop:16}}>
                  {[
                    {label:"Today",   val:"₹"+todayExp.toLocaleString()},
                    {label:"Avg/day", val:"₹"+(monthExp.length?Math.round(totalMonth/new Date().getDate()):0).toLocaleString()},
                    {label:"Top cat", val:expByCat.length?expByCat[0].icon:"—"},
                  ].map(s=>(
                    <div key={s.label}>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{s.label}</div>
                      <div style={{fontSize:15,fontWeight:600,color:"#fff",marginTop:2}}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="dash-btn" onClick={()=>setSheet("addExp")} style={{marginBottom:12,color:"var(--accent)",borderColor:"#6366f130"}}>
                + Add expense
              </button>

              {expTrend.some(d=>d.amt>0) && (
                <div className="card" style={{marginBottom:12}}>
                  <div className="sec">Spending (7 days)</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={expTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                      <XAxis dataKey="label" tick={{fontSize:11,fill:muted}} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:11,fill:muted}} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{background:card,border:`1px solid ${border}`,borderRadius:10,fontSize:12,color:text}} formatter={v=>["₹"+v,"Spent"]}/>
                      <Bar dataKey="amt" fill="#6366f1" radius={[5,5,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {expByCat.length>0 && (
                <div className="card" style={{marginBottom:12}}>
                  <div className="sec">By category</div>
                  {expByCat.map(c=>(
                    <div key={c.id} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:14}}>
                        <span>{c.icon} {c.label}</span>
                        <span style={{fontWeight:600}}>₹{c.total.toLocaleString()}</span>
                      </div>
                      <div style={{height:5,background:border,borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(c.total/totalMonth)*100}%`,background:c.color,borderRadius:99,transition:"width .4s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <div className="sec">Transactions</div>
                {expenses.length===0 && (
                  <div style={{textAlign:"center",padding:"24px 0",color:muted,fontSize:14}}>
                    <div style={{fontSize:32,marginBottom:8}}>💸</div>
                    No expenses yet
                  </div>
                )}
                {expenses.slice(0,30).map((e,i)=>(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<Math.min(expenses.length,30)-1?`1px solid ${border}`:"none"}}>
                    <div style={{width:44,height:44,borderRadius:12,flexShrink:0,background:catColor(e.cat)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>
                      {catIcon(e.cat)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</div>
                      <div style={{fontSize:12,color:muted,marginTop:1}}>{catLabel(e.cat)} · {fmtKey(e.date)}</div>
                      {e.note && <div style={{fontSize:11,color:muted,marginTop:1,fontStyle:"italic"}}>{e.note}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:"#ef4444"}}>₹{e.amount.toLocaleString()}</div>
                      <button onClick={()=>setExpenses(p=>p.filter(x=>x.id!==e.id))} style={{fontSize:11,color:muted,marginTop:2}}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── NOTES ─────────────────────────────────────────────────── */}
          {tab==="notes" && (
            <>
              <button className="dash-btn" onClick={()=>{setNoteForm({title:"",text:""});setSheet("addNote");}} style={{marginBottom:12,color:"var(--accent)",borderColor:"#6366f130"}}>
                + New note
              </button>
              {notes.length===0 && (
                <div style={{textAlign:"center",padding:"48px 0",color:muted}}>
                  <div style={{fontSize:40,marginBottom:12}}>📝</div>
                  <div style={{fontSize:15,fontWeight:500}}>No notes yet</div>
                  <div style={{fontSize:13,marginTop:4}}>Tap above to write your first one</div>
                </div>
              )}
              {notes.map(n=>(
                <div key={n.id} className="card" style={{marginBottom:10,borderLeft:`3px solid ${n.pinned?"#f59e0b":"transparent"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:15,fontWeight:600,flex:1}}>{n.title||"Untitled"}</div>
                    <div style={{display:"flex",gap:8,marginLeft:8}}>
                      <button onClick={()=>setNotes(p=>p.map(x=>x.id===n.id?{...x,pinned:!x.pinned}:x))} style={{fontSize:16,opacity:n.pinned?1:.3,transition:"opacity .2s"}}>📌</button>
                      <button onClick={()=>setNotes(p=>p.filter(x=>x.id!==n.id))} style={{color:muted,fontSize:18}}>×</button>
                    </div>
                  </div>
                  <div style={{fontSize:14,color:muted,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{n.text}</div>
                  <div style={{fontSize:11,color:muted,marginTop:10}}>{fmtKey(n.date)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── SHEETS ────────────────────────────────────────────────────── */}

      <Sheet open={sheet==="addTask"} onClose={()=>setSheet(null)} title={taskForm.type==="special"?"⭐ Priority task":taskForm.type==="extra"?"Extra task for today":"Add daily task"}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Task">
            <input value={taskForm.text} onChange={e=>setTaskForm(p=>({...p,text:e.target.value}))} placeholder="What do you need to do?" autoFocus/>
          </Field>
          <Field label="Category">
            <select value={taskForm.cat} onChange={e=>setTaskForm(p=>({...p,cat:e.target.value}))}>
              {TASK_CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <button className="btn-p" onClick={()=>{
            if(!taskForm.text.trim()) return;
            if(taskForm.type==="regular") setTasks(p=>[...p,{id:Date.now(),text:taskForm.text.trim(),cat:taskForm.cat,type:"regular"}]);
            else if(taskForm.type==="extra") patchDay(tk,{extra:[...(today.extra||[]),{text:taskForm.text.trim(),done:false}]});
            else patchDay(tk,{special:[...(today.special||[]),{text:taskForm.text.trim(),done:false}]});
            setSheet(null);
          }}>Add task</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="addExp"} onClose={()=>setSheet(null)} title="Add expense">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontWeight:700,fontSize:20,color:muted}}>₹</span>
            <input type="number" value={expForm.amount} onChange={e=>setExpForm(p=>({...p,amount:e.target.value}))} placeholder="0" autoFocus style={{paddingLeft:34,fontSize:26,fontWeight:700,letterSpacing:-.5}}/>
          </div>
          <Field label="Description">
            <input value={expForm.desc} onChange={e=>setExpForm(p=>({...p,desc:e.target.value}))} placeholder="What did you spend on?"/>
          </Field>
          <Field label="Category">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {EXP_CATS.map(c=>(
                <button key={c.id} onClick={()=>setExpForm(p=>({...p,cat:c.id}))} style={{padding:"10px 4px",borderRadius:12,background:expForm.cat===c.id?c.color+"22":inp,border:`1.5px solid ${expForm.cat===c.id?c.color:border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .15s"}}>
                  <span style={{fontSize:20}}>{c.icon}</span>
                  <span style={{fontSize:10,fontWeight:600,color:expForm.cat===c.id?c.color:muted}}>{c.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Date">
            <input type="date" value={expForm.date} onChange={e=>setExpForm(p=>({...p,date:e.target.value}))}/>
          </Field>
          <Field label="Note (optional)">
            <input value={expForm.note} onChange={e=>setExpForm(p=>({...p,note:e.target.value}))} placeholder="Any details..."/>
          </Field>
          <button className="btn-p" onClick={addExp}>Save expense</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="dayNote"} onClose={()=>setSheet(null)} title="Day note">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <textarea value={today.note||""} onChange={e=>patchDay(tk,{note:e.target.value})} placeholder="How was your day? Anything to capture..." rows={6} autoFocus/>
          <button className="btn-p" onClick={()=>setSheet(null)}>Done</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="addNote"} onClose={()=>setSheet(null)} title="New note">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input value={noteForm.title} onChange={e=>setNoteForm(p=>({...p,title:e.target.value}))} placeholder="Title (optional)" autoFocus/>
          <textarea value={noteForm.text} onChange={e=>setNoteForm(p=>({...p,text:e.target.value}))} placeholder="Write your note..." rows={6}/>
          <button className="btn-p" onClick={()=>{
            if(!noteForm.text.trim()) return;
            setNotes(p=>[{id:Date.now(),title:noteForm.title,text:noteForm.text,date:todayKey(),pinned:false},...p]);
            setSheet(null);
          }}>Save note</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="reminder"} onClose={()=>setSheet(null)} title="Set reminder">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <input value={remLabel} onChange={e=>setRemLabel(e.target.value)} placeholder="Reminder message (optional)"/>
          <div className="sec">Remind me in</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[1,3,5].map(h=>(
              <button key={h} onClick={()=>setRemHrs(h)} style={{padding:"18px 0",borderRadius:14,background:remHrs===h?"#6366f1":inp,border:`1.5px solid ${remHrs===h?"#6366f1":border}`,color:remHrs===h?"#fff":text,fontSize:18,fontWeight:700,transition:"all .15s"}}>
                {h}<span style={{fontSize:13,fontWeight:500}}>h</span>
              </button>
            ))}
          </div>
          <button className="btn-p" onClick={startReminder}>Set reminder</button>
          {reminder.active && <button onClick={cancelReminder} style={{color:"#ef4444",fontSize:14,fontWeight:600,padding:8}}>Cancel current reminder</button>}
        </div>
      </Sheet>
    </>
  );
}

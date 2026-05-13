import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(key) {
  const [y,m,d] = key.split("-");
  const date = new Date(y, m-1, d);
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[date.getMonth()]} ${y}`;
}

function getPast7Days() {
  return Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-6+i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
}

const EXPENSE_CATS = ["Food","Transport","Shopping","Health","Entertainment","Bills","Education","Other"];

const MOOD_OPTS = [
  {label:"😄 Great", val:"great", color:"#10b981"},
  {label:"🙂 Good", val:"good", color:"#6366f1"},
  {label:"😐 Okay", val:"okay", color:"#f59e0b"},
  {label:"😔 Low", val:"low", color:"#f97316"},
  {label:"😞 Bad", val:"bad", color:"#ef4444"},
];

const WEATHER_ICONS = {Clear:"☀️", Clouds:"☁️", Rain:"🌧️", Drizzle:"🌦️", Snow:"❄️", Thunderstorm:"⛈️", default:"🌤️"};

const TABS = ["Today","Analysis","Notes","Expenses","History"];

function useStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

// ── tiny modal ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)"}} onClick={onClose}>
      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:16,padding:"1.5rem",minWidth:340,maxWidth:520,width:"90vw",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <span style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"var(--muted)"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Circular progress ────────────────────────────────────────────────────────
function CircleProgress({ pct, size=120, stroke=10, color="#6366f1", label }) {
  const r = (size-stroke*2)/2, circ = 2*Math.PI*r;
  const dash = (pct/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 0.6s ease"}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{transform:`rotate(90deg) translate(0px, -${size}px)`,fill:"var(--text)",fontSize:size>80?18:13,fontWeight:700}}>
        {Math.round(pct)}%
      </text>
      {label && <text x={size/2} y={size/2+18} textAnchor="middle" dominantBaseline="central"
        style={{transform:`rotate(90deg) translate(0px, -${size}px)`,fill:"var(--muted)",fontSize:10}}>
        {label}
      </text>}
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("Today");
  const [dark, setDark] = useState(false);

  // Regular tasks (template that repeats daily)
  const [regularTasks, setRegularTasks] = useStorage("rt_regular", [
    {id:1,text:"Morning workout",cat:"Health"},
    {id:2,text:"Read for 30 min",cat:"Learning"},
    {id:3,text:"Review emails",cat:"Work"},
  ]);

  // Per-day data
  const [dayData, setDayData] = useStorage("rt_daydata", {});
  const [selectedDay, setSelectedDay] = useState(getTodayKey());

  // Notes
  const [notes, setNotes] = useStorage("rt_notes", []);
  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");

  // Expenses
  const [expenses, setExpenses] = useStorage("rt_expenses", []);
  const [expForm, setExpForm] = useState({amount:"",desc:"",cat:"Food",date:getTodayKey()});

  // Reminder
  const [reminder, setReminder] = useStorage("rt_reminder", {hour:null, active:false, taskId:null});
  const [reminderModal, setReminderModal] = useState(false);
  const [reminderTask, setReminderTask] = useState("");
  const [reminderHr, setReminderHr] = useState(1);
  const reminderTimerRef = useRef(null);

  // Task modal
  const [addTaskModal, setAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({text:"",cat:"Work"});
  const [addSpecialModal, setAddSpecialModal] = useState(false);
  const [newSpecial, setNewSpecial] = useState({text:"",cat:"Special"});
  const [addExtraModal, setAddExtraModal] = useState(false);
  const [newExtra, setNewExtra] = useState({text:"",cat:"Extra"});

  // Weather
  const [weather, setWeather] = useStorage("rt_weather", null);
  const [weatherLoaded, setWeatherLoaded] = useState(false);

  // Quote
  const [quote, setQuote] = useState(null);

  // Mood
  const [mood, setMood] = useState("");

  const today = getTodayKey();

  // ── helpers ───────────────────────────────────────────────────────────────
  const getDay = useCallback((key) => {
    return dayData[key] || { checks:{}, extra:[], special:[], mood:"", note:"" };
  }, [dayData]);

  const setDay = useCallback((key, patch) => {
    setDayData(prev => ({...prev, [key]: {...(prev[key]||{checks:{},extra:[],special:[],mood:"",note:""}), ...patch}}));
  }, [setDayData]);

  const todayD = getDay(selectedDay);

  function toggleCheck(id) {
    const cur = todayD.checks || {};
    setDay(selectedDay, {checks:{...cur, [id]: !cur[id]}});
  }

  function toggleExtraCheck(idx) {
    const arr = [...(todayD.extra||[])];
    arr[idx] = {...arr[idx], done: !arr[idx].done};
    setDay(selectedDay, {extra:arr});
  }

  function toggleSpecialCheck(idx) {
    const arr = [...(todayD.special||[])];
    arr[idx] = {...arr[idx], done: !arr[idx].done};
    setDay(selectedDay, {special:arr});
  }

  // Compute completion pct
  function computePct(key) {
    const d = getDay(key);
    const total = regularTasks.length + (d.extra||[]).length + (d.special||[]).length;
    if(!total) return 0;
    const done = regularTasks.filter(t => d.checks?.[t.id]).length
      + (d.extra||[]).filter(x=>x.done).length
      + (d.special||[]).filter(x=>x.done).length;
    return Math.round((done/total)*100);
  }

  // 7-day trend
  const past7 = getPast7Days();
  const trendData = past7.map(k => ({
    label: k.slice(5),
    pct: computePct(k),
    tasks: (getDay(k).extra||[]).length + regularTasks.length + (getDay(k).special||[]).length,
  }));

  // Expense stats
  const totalExpense = expenses.reduce((s,e)=>s+Number(e.amount),0);
  const expByCat = EXPENSE_CATS.map(c=>({name:c, value:expenses.filter(e=>e.cat===c).reduce((s,e)=>s+Number(e.amount),0)})).filter(x=>x.value>0);
  const expByDay = past7.map(k=>({label:k.slice(5), amount:expenses.filter(e=>e.date===k).reduce((s,e)=>s+Number(e.amount),0)}));

  // Mood trend
  const moodScore = {great:5,good:4,okay:3,low:2,bad:1};
  const moodData = past7.map(k=>({label:k.slice(5), score:moodScore[getDay(k).mood]||0}));

  // Radar (productivity categories)
  const catList = [...new Set(regularTasks.map(t=>t.cat))];
  const radarData = catList.map(c=>{
    const tasks = regularTasks.filter(t=>t.cat===c);
    const done = tasks.filter(t=>todayD.checks?.[t.id]).length;
    return {cat:c, done, total:tasks.length, pct: tasks.length ? Math.round((done/tasks.length)*100) : 0};
  });

  // ── Weather fetch ─────────────────────────────────────────────────────────
  useEffect(()=>{
    if(weatherLoaded) return;
    navigator.geolocation?.getCurrentPosition(async pos=>{
      try{
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`);
        const d = await r.json();
        const c = d.current;
        const codeMap = {0:"Clear",1:"Clear",2:"Clouds",3:"Clouds",45:"Fog",48:"Fog",51:"Drizzle",61:"Rain",71:"Snow",80:"Rain",95:"Thunderstorm"};
        const desc = codeMap[c.weathercode]||"Clear";
        setWeather({temp:Math.round(c.temperature_2m), desc, wind:Math.round(c.windspeed_10m)});
      }catch{}
      setWeatherLoaded(true);
    },()=>setWeatherLoaded(true));
  },[weatherLoaded]);

  // ── Quote ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const quotes=[
      {text:"The secret of getting ahead is getting started.", auth:"Mark Twain"},
      {text:"Don't watch the clock; do what it does. Keep going.", auth:"Sam Levenson"},
      {text:"Small steps every day lead to big results.", auth:"Unknown"},
      {text:"Focus on progress, not perfection.", auth:"Unknown"},
      {text:"Today's actions are tomorrow's results.", auth:"Unknown"},
      {text:"Your future is created by what you do today.", auth:"Robert Kiyosaki"},
      {text:"Discipline is choosing between what you want now and what you want most.", auth:"Abraham Lincoln"},
    ];
    setQuote(quotes[new Date().getDay()%quotes.length]);
  },[]);

  // ── Reminder ─────────────────────────────────────────────────────────────
  function setReminderNow() {
    if(reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    const ms = reminderHr * 60 * 60 * 1000;
    reminderTimerRef.current = setTimeout(()=>{
      alert(`⏰ Reminder: "${reminderTask || 'Check your tasks!'}" — Time's up!`);
    }, ms);
    setReminder({hour:reminderHr, active:true, task:reminderTask});
    setReminderModal(false);
  }

  function cancelReminder() {
    if(reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    setReminder({hour:null,active:false,task:""});
  }

  // ── Add regular task ──────────────────────────────────────────────────────
  function addRegularTask() {
    if(!newTask.text.trim()) return;
    setRegularTasks(prev=>[...prev,{id:Date.now(),text:newTask.text.trim(),cat:newTask.cat}]);
    setNewTask({text:"",cat:"Work"});
    setAddTaskModal(false);
  }

  function removeRegularTask(id) {
    setRegularTasks(prev=>prev.filter(t=>t.id!==id));
  }

  // ── Add extra/special ────────────────────────────────────────────────────
  function addExtra() {
    if(!newExtra.text.trim()) return;
    setDay(selectedDay,{extra:[...(todayD.extra||[]),{text:newExtra.text.trim(),cat:newExtra.cat,done:false}]});
    setNewExtra({text:"",cat:"Extra"});
    setAddExtraModal(false);
  }

  function addSpecial() {
    if(!newSpecial.text.trim()) return;
    setDay(selectedDay,{special:[...(todayD.special||[]),{text:newSpecial.text.trim(),cat:newSpecial.cat,done:false}]});
    setNewSpecial({text:"",cat:"Special"});
    setAddSpecialModal(false);
  }

  // ── Add expense ───────────────────────────────────────────────────────────
  function addExpense() {
    if(!expForm.amount||!expForm.desc) return;
    setExpenses(prev=>[{...expForm,id:Date.now(),...expForm},...prev]);
    setExpForm({amount:"",desc:"",cat:"Food",date:getTodayKey()});
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const css = `
    :root{
      --bg:${dark?"#0f0f13":"#f8f8fc"};
      --card:${dark?"#1a1a23":"#ffffff"};
      --border:${dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"};
      --text:${dark?"#e8e8f0":"#1a1a2e"};
      --muted:${dark?"#7070a0":"#6b6b8a"};
      --accent:#6366f1;
      --accent2:#10b981;
      --accent3:#f59e0b;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;transition:background .3s,color .3s}
    .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:1.25rem}
    .pill{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600}
    input,select,textarea{background:${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"};border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 12px;font-size:14px;width:100%;outline:none;font-family:inherit}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)}
    button{cursor:pointer;font-family:inherit}
    .btn{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;transition:opacity .2s}
    .btn:hover{opacity:.85}
    .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 16px;font-size:13px;font-weight:500;transition:background .2s}
    .btn-ghost:hover{background:${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"}}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
    .checkbox-custom{width:20px;height:20px;border-radius:6px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0}
    .checkbox-custom.checked{background:var(--accent);border-color:var(--accent)}
    .tab-active{background:var(--accent);color:#fff!important}
    .task-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
    .task-row:last-child{border-bottom:none}
    .fade-in{animation:fadeIn .35s ease}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  `;

  const pct = computePct(selectedDay);
  const totalTasks = regularTasks.length + (todayD.extra||[]).length + (todayD.special||[]).length;
  const doneTasks = regularTasks.filter(t=>todayD.checks?.[t.id]).length
    + (todayD.extra||[]).filter(x=>x.done).length
    + (todayD.special||[]).filter(x=>x.done).length;

  const CAT_COLORS = {Work:"#6366f1",Health:"#10b981",Learning:"#f59e0b",Personal:"#8b5cf6",Special:"#ef4444",Extra:"#06b6d4",Other:"#f97316"};

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:"100vh",background:"var(--bg)",paddingBottom:40}}>

        {/* Header */}
        <div style={{background:"var(--card)",borderBottom:"1px solid var(--border)",padding:"0.75rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>✦</span>
            <span style={{fontWeight:700,fontSize:16,color:"var(--accent)"}}>DayFlow</span>
            <span style={{fontSize:12,color:"var(--muted)",marginLeft:4}}>{formatDate(today)}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {weather && (
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"var(--muted)"}}>
                <span>{WEATHER_ICONS[weather.desc]||"🌤️"}</span>
                <span style={{fontWeight:600,color:"var(--text)"}}>{weather.temp}°C</span>
                <span style={{fontSize:11}}>{weather.desc}</span>
              </div>
            )}
            {reminder.active && (
              <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(99,102,241,0.12)",borderRadius:8,padding:"4px 10px",fontSize:12,color:"var(--accent)",fontWeight:600}}>
                ⏰ {reminder.hour}hr reminder
                <button onClick={cancelReminder} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14,marginLeft:2}}>✕</button>
              </div>
            )}
            <button onClick={()=>setReminderModal(true)} className="btn-ghost" style={{padding:"6px 12px",fontSize:12}}>⏰ Reminder</button>
            <button onClick={()=>setDark(d=>!d)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",color:"var(--text)",fontSize:14}}>
              {dark?"☀️":"🌙"}
            </button>
          </div>
        </div>

        {/* Quote bar */}
        {quote && (
          <div style={{background:"linear-gradient(90deg,#6366f1,#8b5cf6)",padding:"8px 1.25rem",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.9)",fontStyle:"italic"}}>"{quote.text}"</span>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginLeft:"auto",whiteSpace:"nowrap"}}>— {quote.auth}</span>
          </div>
        )}

        {/* Nav tabs */}
        <div style={{padding:"0.75rem 1.25rem 0",display:"flex",gap:6,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={tab===t?"btn tab-active":"btn-ghost"} style={{padding:"6px 16px",fontSize:13,whiteSpace:"nowrap",borderRadius:8}}>
              {t==="Today"?"📋":t==="Analysis"?"📊":t==="Notes"?"📝":t==="Expenses"?"💰":"🗂️"} {t}
            </button>
          ))}
        </div>

        <div style={{padding:"1rem 1.25rem",maxWidth:900,margin:"0 auto"}}>

          {/* ═══ TODAY ═══════════════════════════════════════════════════════════ */}
          {tab==="Today" && (
            <div className="fade-in">
              {/* Summary row */}
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr",gap:12,marginBottom:16,alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <CircleProgress pct={pct} size={100} stroke={9} color={pct>=80?"#10b981":pct>=50?"#6366f1":"#f59e0b"}/>
                  <span style={{fontSize:11,color:"var(--muted)"}}>Day completion</span>
                </div>
                {[
                  {label:"Total tasks",val:totalTasks,icon:"📋",color:"#6366f1"},
                  {label:"Completed",val:doneTasks,icon:"✅",color:"#10b981"},
                  {label:"Remaining",val:totalTasks-doneTasks,icon:"⏳",color:"#f59e0b"},
                ].map(s=>(
                  <div key={s.label} className="card" style={{textAlign:"center"}}>
                    <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                    <div style={{fontSize:28,fontWeight:700,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Mood */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--muted)",marginBottom:10}}>Today's mood</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {MOOD_OPTS.map(m=>(
                    <button key={m.val} onClick={()=>setDay(selectedDay,{mood:m.val})}
                      style={{background:todayD.mood===m.val?m.color+"22":"transparent",border:`1.5px solid ${todayD.mood===m.val?m.color:"var(--border)"}`,borderRadius:99,padding:"6px 14px",fontSize:13,color:todayD.mood===m.val?m.color:"var(--text)",cursor:"pointer",fontWeight:todayD.mood===m.val?700:400,transition:"all .2s"}}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day selector if not today */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={{fontSize:13,color:"var(--muted)"}}>Viewing:</span>
                <input type="date" value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} style={{width:160}}/>
                {selectedDay!==today && <button className="btn" onClick={()=>setSelectedDay(today)} style={{padding:"6px 12px",fontSize:12}}>Today</button>}
              </div>

              {/* Regular tasks */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:700,fontSize:15}}>Regular Tasks</span>
                  <button onClick={()=>setAddTaskModal(true)} className="btn" style={{padding:"5px 12px",fontSize:12}}>+ Add</button>
                </div>
                {regularTasks.length===0 && <p style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"1rem 0"}}>No regular tasks yet. Add some!</p>}
                {regularTasks.map(task=>(
                  <div key={task.id} className="task-row">
                    <div className={`checkbox-custom${todayD.checks?.[task.id]?" checked":""}`} onClick={()=>toggleCheck(task.id)}>
                      {todayD.checks?.[task.id] && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{flex:1,textDecoration:todayD.checks?.[task.id]?"line-through":"none",color:todayD.checks?.[task.id]?"var(--muted)":"var(--text)",fontSize:14}}>{task.text}</span>
                    <span className="pill" style={{background:(CAT_COLORS[task.cat]||"#888")+"22",color:CAT_COLORS[task.cat]||"#888"}}>{task.cat}</span>
                    <button onClick={()=>removeRegularTask(task.id)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16}}>🗑</button>
                  </div>
                ))}
              </div>

              {/* Extra tasks for the day */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:700,fontSize:15}}>Extra Tasks <span style={{fontSize:12,color:"var(--muted)",fontWeight:400}}>(for this day)</span></span>
                  <button onClick={()=>setAddExtraModal(true)} className="btn" style={{padding:"5px 12px",fontSize:12,background:"#06b6d4"}}>+ Extra</button>
                </div>
                {(todayD.extra||[]).length===0 && <p style={{color:"var(--muted)",fontSize:13}}>No extra tasks for this day.</p>}
                {(todayD.extra||[]).map((t,i)=>(
                  <div key={i} className="task-row">
                    <div className={`checkbox-custom${t.done?" checked":""}`} onClick={()=>toggleExtraCheck(i)} style={t.done?{background:"#06b6d4",borderColor:"#06b6d4"}:{}}>
                      {t.done && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{flex:1,textDecoration:t.done?"line-through":"none",color:t.done?"var(--muted)":"var(--text)",fontSize:14}}>{t.text}</span>
                    <span className="pill" style={{background:"#06b6d422",color:"#06b6d4"}}>{t.cat}</span>
                  </div>
                ))}
              </div>

              {/* Special tasks */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:700,fontSize:15}}>Special Tasks <span style={{fontSize:12,color:"var(--muted)",fontWeight:400}}>⭐ priority</span></span>
                  <button onClick={()=>setAddSpecialModal(true)} className="btn" style={{padding:"5px 12px",fontSize:12,background:"#ef4444"}}>+ Special</button>
                </div>
                {(todayD.special||[]).length===0 && <p style={{color:"var(--muted)",fontSize:13}}>No special tasks for this day.</p>}
                {(todayD.special||[]).map((t,i)=>(
                  <div key={i} className="task-row">
                    <div className={`checkbox-custom${t.done?" checked":""}`} onClick={()=>toggleSpecialCheck(i)} style={t.done?{background:"#ef4444",borderColor:"#ef4444"}:{}}>
                      {t.done && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{flex:1,textDecoration:t.done?"line-through":"none",color:t.done?"var(--muted)":"var(--text)",fontSize:14}}>{t.text}</span>
                    <span className="pill" style={{background:"#ef444422",color:"#ef4444"}}>⭐ {t.cat}</span>
                  </div>
                ))}
              </div>

              {/* Day note */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Day Note</div>
                <textarea value={todayD.note||""} onChange={e=>setDay(selectedDay,{note:e.target.value})}
                  placeholder="Write a quick note for this day..." rows={3} style={{resize:"vertical"}}/>
              </div>
            </div>
          )}

          {/* ═══ ANALYSIS ════════════════════════════════════════════════════════ */}
          {tab==="Analysis" && (
            <div className="fade-in">
              {/* Overview cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
                {[
                  {label:"7-day avg",val:Math.round(trendData.reduce((s,d)=>s+d.pct,0)/7)+"%",color:"#6366f1"},
                  {label:"Best day",val:(()=>{const b=trendData.reduce((a,c)=>c.pct>a.pct?c:a,trendData[0]);return b.label+" ("+b.pct+"%)"})(),color:"#10b981"},
                  {label:"Today",val:computePct(today)+"%",color:"#f59e0b"},
                  {label:"Total expenses",val:"₹"+totalExpense.toLocaleString(),color:"#ef4444"},
                ].map(s=>(
                  <div key={s.label} className="card" style={{textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Completion trend */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📈 7-Day Completion Trend</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="label" tick={{fontSize:11,fill:"var(--muted)"}} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{fontSize:11,fill:"var(--muted)"}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} formatter={(v)=>[v+"%","Completion"]}/>
                    <Area type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad1)" dot={{fill:"#6366f1",r:4}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Bar + mood side by side */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div className="card">
                  <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🎯 Daily Tasks Count</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:"var(--muted)"}} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"var(--muted)"}} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}}/>
                      <Bar dataKey="tasks" fill="#10b981" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>😊 Mood Trend</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={moodData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:"var(--muted)"}} tickLine={false}/>
                      <YAxis domain={[0,5]} ticks={[1,2,3,4,5]} tickFormatter={v=>["","😞","😔","😐","🙂","😄"][v]} tick={{fontSize:12}} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} formatter={v=>["😄😊😐😔😞".split("")[5-v]||"-","Mood"]}/>
                      <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2.5} dot={{fill:"#f59e0b",r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category radar + Expense pie */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div className="card">
                  <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>🕸️ Category Performance</div>
                  {radarData.length===0 ? <p style={{color:"var(--muted)",fontSize:13}}>Add tasks with categories to see radar.</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)"/>
                        <PolarAngleAxis dataKey="cat" tick={{fontSize:10,fill:"var(--muted)"}}/>
                        <Radar dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2}/>
                        <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} formatter={v=>[v+"%","Done"]}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="card">
                  <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>💰 Expense Breakdown</div>
                  {expByCat.length===0 ? <p style={{color:"var(--muted)",fontSize:13}}>No expenses logged yet.</p> : (
                    <>
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                          <Pie data={expByCat} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                            {expByCat.map((e,i)=><Cell key={e.name} fill={COLORS[i%COLORS.length]}/>)}
                          </Pie>
                          <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} formatter={v=>["₹"+v,"Amount"]}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                        {expByCat.map((e,i)=>(
                          <span key={e.name} style={{fontSize:10,display:"flex",alignItems:"center",gap:3,color:"var(--muted)"}}>
                            <span style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length],display:"inline-block"}}></span>{e.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Daily expense bar */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📅 Daily Spending (7 days)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={expByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="label" tick={{fontSize:11,fill:"var(--muted)"}} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:"var(--muted)"}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} formatter={v=>["₹"+v,"Spent"]}/>
                    <Bar dataKey="amount" fill="#f59e0b" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Streaks & insights */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>💡 Insights</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                  {(()=>{
                    const avg=Math.round(trendData.reduce((s,d)=>s+d.pct,0)/7);
                    const best=trendData.reduce((a,c)=>c.pct>a.pct?c:a,trendData[0]);
                    const streak = trendData.filter(d=>d.pct>=50).length;
                    const insights=[
                      {icon:"🔥",title:"Streak",val:`${streak}/7 days ≥50% done`,color:"#f97316"},
                      {icon:"🏆",title:"Best day",val:`${best.label} at ${best.pct}%`,color:"#10b981"},
                      {icon:"📊",title:"Weekly avg",val:`${avg}% completion`,color:"#6366f1"},
                      {icon:"💸",title:"Avg daily spend",val:`₹${Math.round(totalExpense/7)}`,color:"#ef4444"},
                    ];
                    return insights.map(ins=>(
                      <div key={ins.title} style={{background:ins.color+"11",border:`1px solid ${ins.color}33`,borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:22}}>{ins.icon}</span>
                        <div>
                          <div style={{fontSize:12,color:"var(--muted)"}}>{ins.title}</div>
                          <div style={{fontSize:14,fontWeight:600,color:ins.color}}>{ins.val}</div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══ NOTES ═══════════════════════════════════════════════════════════ */}
          {tab==="Notes" && (
            <div className="fade-in">
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📝 Add Note</div>
                <input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="Note title..." style={{marginBottom:8}}/>
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Write your note here..." rows={4} style={{marginBottom:8,resize:"vertical"}}/>
                <button className="btn" onClick={()=>{if(!noteText.trim()) return; setNotes(p=>[{id:Date.now(),title:noteTitle||"Note",text:noteText,date:getTodayKey(),pinned:false},...p]); setNoteText(""); setNoteTitle("");}}>
                  Save Note
                </button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                {notes.map(n=>(
                  <div key={n.id} className="card" style={{position:"relative",borderLeft:`3px solid ${n.pinned?"#f59e0b":"var(--border)"}`,transition:"border .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <span style={{fontWeight:600,fontSize:14}}>{n.title}</span>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>setNotes(p=>p.map(x=>x.id===n.id?{...x,pinned:!x.pinned}:x))}
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:15,opacity:n.pinned?1:0.4}}>📌</button>
                        <button onClick={()=>setNotes(p=>p.filter(x=>x.id!==n.id))}
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--muted)"}}>🗑</button>
                      </div>
                    </div>
                    <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.text}</p>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>{formatDate(n.date)}</div>
                  </div>
                ))}
                {notes.length===0 && <p style={{color:"var(--muted)",fontSize:13}}>No notes yet. Write your first one!</p>}
              </div>
            </div>
          )}

          {/* ═══ EXPENSES ════════════════════════════════════════════════════════ */}
          {tab==="Expenses" && (
            <div className="fade-in">
              {/* Summary */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:12}}>
                {[
                  {label:"Total spent",val:"₹"+totalExpense.toLocaleString(),color:"#ef4444"},
                  {label:"Transactions",val:expenses.length,color:"#6366f1"},
                  {label:"Today",val:"₹"+expenses.filter(e=>e.date===today).reduce((s,e)=>s+Number(e.amount),0).toLocaleString(),color:"#f59e0b"},
                  {label:"Top category",val:expByCat.length?expByCat.reduce((a,c)=>c.value>a.value?c:a,expByCat[0]).name:"-",color:"#10b981"},
                ].map(s=>(
                  <div key={s.label} className="card" style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Add expense form */}
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Add Expense</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Amount (₹)</div>
                    <input type="number" value={expForm.amount} onChange={e=>setExpForm(p=>({...p,amount:e.target.value}))} placeholder="0"/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Description</div>
                    <input value={expForm.desc} onChange={e=>setExpForm(p=>({...p,desc:e.target.value}))} placeholder="Where did you spend?"/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Category</div>
                    <select value={expForm.cat} onChange={e=>setExpForm(p=>({...p,cat:e.target.value}))}>
                      {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Date</div>
                    <input type="date" value={expForm.date} onChange={e=>setExpForm(p=>({...p,date:e.target.value}))}/>
                  </div>
                  <button className="btn" onClick={addExpense} style={{alignSelf:"flex-end"}}>Add</button>
                </div>
              </div>

              {/* Expense list */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Transaction History</div>
                {expenses.length===0 && <p style={{color:"var(--muted)",fontSize:13}}>No expenses logged yet.</p>}
                <div style={{maxHeight:350,overflowY:"auto"}}>
                  {expenses.map(e=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                      <div style={{width:36,height:36,borderRadius:10,background:COLORS[EXPENSE_CATS.indexOf(e.cat)%COLORS.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                        {{"Food":"🍔","Transport":"🚗","Shopping":"🛍️","Health":"💊","Entertainment":"🎬","Bills":"🧾","Education":"📚","Other":"💳"}[e.cat]||"💳"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:500}}>{e.desc}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{e.cat} · {formatDate(e.date)}</div>
                      </div>
                      <div style={{fontWeight:700,color:"#ef4444",fontSize:15}}>₹{Number(e.amount).toLocaleString()}</div>
                      <button onClick={()=>setExpenses(p=>p.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16}}>🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ HISTORY ═════════════════════════════════════════════════════════ */}
          {tab==="History" && (
            <div className="fade-in">
              <div className="card" style={{marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🗂️ Past 7 Days Summary</div>
                {past7.slice().reverse().map(k=>{
                  const p=computePct(k);
                  const d=getDay(k);
                  return (
                    <div key={k} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
                      <CircleProgress pct={p} size={52} stroke={5} color={p>=80?"#10b981":p>=50?"#6366f1":"#f59e0b"}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:14}}>{formatDate(k)} {k===today?"(Today)":""}</div>
                        <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
                          {regularTasks.filter(t=>d.checks?.[t.id]).length}/{regularTasks.length} regular · {(d.extra||[]).filter(x=>x.done).length}/{(d.extra||[]).length} extra · {(d.special||[]).filter(x=>x.done).length}/{(d.special||[]).length} special
                        </div>
                        {d.mood && <div style={{fontSize:11,marginTop:2}}>{MOOD_OPTS.find(m=>m.val===d.mood)?.label}</div>}
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:20,fontWeight:700,color:p>=80?"#10b981":p>=50?"#6366f1":"#f59e0b"}}>{p}%</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>completion</div>
                      </div>
                      <button onClick={()=>{setSelectedDay(k);setTab("Today");}} className="btn-ghost" style={{padding:"5px 10px",fontSize:12}}>View</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Modals ─────────────────────────────────────────────────────────── */}
        <Modal open={addTaskModal} onClose={()=>setAddTaskModal(false)} title="Add Regular Task">
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={newTask.text} onChange={e=>setNewTask(p=>({...p,text:e.target.value}))} placeholder="Task description..."/>
            <select value={newTask.cat} onChange={e=>setNewTask(p=>({...p,cat:e.target.value}))}>
              {["Work","Health","Learning","Personal","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="btn" onClick={addRegularTask}>Add Task</button>
          </div>
        </Modal>

        <Modal open={addExtraModal} onClose={()=>setAddExtraModal(false)} title="Add Extra Task (Today)">
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={newExtra.text} onChange={e=>setNewExtra(p=>({...p,text:e.target.value}))} placeholder="Task description..."/>
            <select value={newExtra.cat} onChange={e=>setNewExtra(p=>({...p,cat:e.target.value}))}>
              {["Extra","Work","Health","Learning","Personal","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="btn" style={{background:"#06b6d4"}} onClick={addExtra}>Add Extra Task</button>
          </div>
        </Modal>

        <Modal open={addSpecialModal} onClose={()=>setAddSpecialModal(false)} title="Add Special Task ⭐">
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={newSpecial.text} onChange={e=>setNewSpecial(p=>({...p,text:e.target.value}))} placeholder="Special task description..."/>
            <select value={newSpecial.cat} onChange={e=>setNewSpecial(p=>({...p,cat:e.target.value}))}>
              {["Special","Priority","Urgent","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="btn" style={{background:"#ef4444"}} onClick={addSpecial}>Add Special Task</button>
          </div>
        </Modal>

        <Modal open={reminderModal} onClose={()=>setReminderModal(false)} title="Set Reminder ⏰">
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input value={reminderTask} onChange={e=>setReminderTask(e.target.value)} placeholder="What to remind? (optional)"/>
            <div style={{fontSize:13,color:"var(--muted)"}}>Remind me after:</div>
            <div style={{display:"flex",gap:8}}>
              {[1,3,5].map(h=>(
                <button key={h} onClick={()=>setReminderHr(h)}
                  style={{flex:1,padding:"10px",border:`2px solid ${reminderHr===h?"#6366f1":"var(--border)"}`,borderRadius:10,background:reminderHr===h?"#6366f111":"transparent",color:reminderHr===h?"#6366f1":"var(--text)",cursor:"pointer",fontWeight:reminderHr===h?700:400,fontSize:15}}>
                  {h}hr
                </button>
              ))}
            </div>
            <button className="btn" onClick={setReminderNow}>Set Reminder</button>
          </div>
        </Modal>

      </div>
    </>
  );
}

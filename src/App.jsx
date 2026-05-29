import { useState, useRef, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ─── versioned store ──────────────────────────────────────────────────────── */
const DATA_VERSION = 3;
const STORE_KEY    = "df_store_v3";

function migrate(raw) {
  if (!raw) return null;
  if (raw.version === DATA_VERSION) return raw;
  if (!raw.weekendTasks)  raw.weekendTasks  = [];
  if (!raw.holidayTasks)  raw.holidayTasks  = [];
  if (!raw.holidays)      raw.holidays      = {};
  if (raw.expenses) {
    raw.expenses = raw.expenses.map(e => ({ split:false, splitWith:"", ...e }));
  }
  raw.version = DATA_VERSION;
  return raw;
}

function loadStore(defaults) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    const m   = migrate(raw);
    if (!m) return { ...defaults, version:DATA_VERSION };
    return { ...defaults, ...m, version:DATA_VERSION };
  } catch {
    return { ...defaults, version:DATA_VERSION };
  }
}

function saveStore(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch {}
}

/* ─── constants ────────────────────────────────────────────────────────────── */
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EXP_CATS = [
  { id:"food",      label:"Food",     icon:"🍽️", color:"#ff6b35" },
  { id:"transport", label:"Travel",   icon:"🚗",  color:"#3b9eff" },
  { id:"shopping",  label:"Shopping", icon:"🛍️", color:"#a855f7" },
  { id:"health",    label:"Health",   icon:"💊",  color:"#10d9a0" },
  { id:"bills",     label:"Bills",    icon:"🧾",  color:"#6366f1" },
  { id:"social",    label:"Social",   icon:"🎉",  color:"#f43f8e" },
  { id:"edu",       label:"Learning", icon:"📚",  color:"#f59e0b" },
  { id:"other",     label:"Other",    icon:"💳",  color:"#8b9ab8" },
];

const NOTE_COLORS = ["#6366f1","#10d9a0","#f59e0b","#ef4444","#f43f8e","#06b6d4","#a855f7","#ff6b35"];

const QUOTES = [
  ["Focus on progress, not perfection.","Unknown"],
  ["Small steps every day lead to big results.","Unknown"],
  ["Don't watch the clock; do what it does.","Sam Levenson"],
  ["The secret of getting ahead is getting started.","Mark Twain"],
  ["Your future is created by what you do today.","R. Kiyosaki"],
  ["Discipline is the bridge between goals and accomplishment.","Jim Rohn"],
  ["Today's actions are tomorrow's results.","Unknown"],
];
const WEEKEND_QUOTES = [
  ["Rest when you're weary. Refresh and renew yourself.","Unknown"],
  ["Weekends are a bit like rainbows — beautiful from a distance.","John Shirley"],
  ["Recharge. Reflect. Be ready to shine.","Unknown"],
  ["The best of all gifts is a restful Saturday.","Unknown"],
];
const HOLIDAY_QUOTES = [
  ["All you need is love, laughter and a little holiday.","Unknown"],
  ["Take a rest; a field that has rested gives a bountiful crop.","Ovid"],
  ["A day off is not a day wasted, it is a day invested.","Unknown"],
];

/* ─── date utils ───────────────────────────────────────────────────────────── */
function makeKey(d)    { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function todayKey()    { return makeKey(new Date()); }
function offsetKey(k,n){ const [y,m,d]=k.split("-"),dt=new Date(+y,+m-1,+d);dt.setDate(dt.getDate()+n);return makeKey(dt); }
function fmtKey(k)     { const [y,m,d]=k.split("-"),dt=new Date(+y,+m-1,+d);return `${DAYS[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`; }
function fmtShort(k)   { const [y,m,d]=k.split("-"),dt=new Date(+y,+m-1,+d);return `${DAYS[dt.getDay()].slice(0,3)} ${dt.getDate()}`; }
function getDow(k)     { const [y,m,d]=k.split("-");return new Date(+y,+m-1,+d).getDay(); }
function isWeekend(k)  { const w=getDow(k);return w===0||w===6; }
function past7(fromKey){ const [y,m,d]=fromKey.split("-");return Array.from({length:7},(_,i)=>{const dt=new Date(+y,+m-1,+d);dt.setDate(dt.getDate()-6+i);return makeKey(dt);}); }
function getGreeting() { const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; }
function currMonthPfx(){ const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function pctColor(p)   { return p>=80?"#10d9a0":p>=50?"#6366f1":"#f59e0b"; }
const catOf    = id => EXP_CATS.find(c=>c.id===id)||{color:"#888",icon:"💳",label:"Other"};
const catColor = id => catOf(id).color;
const catIcon  = id => catOf(id).icon;
const catLabel = id => catOf(id).label;

/* ─── defaults ─────────────────────────────────────────────────────────────── */
const EMPTY_DAY = () => ({checks:{},note:"",extra:[],special:[]});

const DEFAULTS = {
  version:      DATA_VERSION,
  dark:         false,
  tasks:        [{id:1,text:"Morning workout"},{id:2,text:"Read 30 mins"},{id:3,text:"Check emails"}],
  weekendTasks: [{id:101,text:"Relax & recharge"},{id:102,text:"Family time"},{id:103,text:"Meal prep"}],
  holidayTasks: [{id:201,text:"Plan the day"},{id:202,text:"Rest & enjoy"},{id:203,text:"Zero screens hour"}],
  holidays:     {},
  dayData:      {},
  expenses:     [],
  notes: [{
    id:9001,title:"Welcome to DayFlow",
    body:"Your premium daily companion.\n\n• Weekdays → regular tasks\n• Weekends → weekend tasks\n• Mark any day as holiday for holiday tasks\n\nLong-press the ⠿ handle to drag & reorder.",
    color:"#6366f1",pinned:true,created:todayKey(),tags:["welcome"],
  }],
};

/* ─── pure sub-components (outside App so they never remount) ──────────────── */

function Sheet({open,onClose,title,children}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",background:"var(--sheet-bg)",backdropFilter:"blur(40px) saturate(200%)",WebkitBackdropFilter:"blur(40px) saturate(200%)",borderRadius:"28px 28px 0 0",border:"1px solid var(--glass-border)",borderBottom:"none",maxHeight:"93vh",overflowY:"auto",animation:"slideUp .3s cubic-bezier(.32,0,.67,0)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 2px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"var(--pill)"}}/>
        </div>
        {title&&<div style={{padding:"8px 22px 14px",fontWeight:700,fontSize:17,color:"var(--text)"}}>{title}</div>}
        <div style={{padding:"0 22px 48px"}}>{children}</div>
      </div>
    </div>
  );
}

function Checkbox({checked,onChange,color="#6366f1"}) {
  return (
    <div data-no-drag onClick={onChange} onTouchStart={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} style={{width:24,height:24,borderRadius:8,flexShrink:0,cursor:"pointer",border:`2px solid ${checked?color:"var(--border)"}`,background:checked?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s cubic-bezier(.34,1.56,.64,1)",boxShadow:checked?`0 0 10px ${color}55`:"none"}}>
      {checked&&<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

function Ring({pct,size=72,stroke=7,color="#6366f1",children}) {
  const r=(size-stroke*2)/2, c=2*Math.PI*r;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}} filter={`drop-shadow(0 0 4px ${color}88)`}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>{children}</div>
    </div>
  );
}

function Lbl({children}) {
  return <div style={{fontSize:11,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.7,marginBottom:7}}>{children}</div>;
}

function Sec({children,action}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8}}>{children}</div>
      {action}
    </div>
  );
}

function Toggle({on,onChange}) {
  return (
    <div onClick={onChange} style={{width:48,height:28,borderRadius:14,position:"relative",cursor:"pointer",flexShrink:0,background:on?"linear-gradient(135deg,#6366f1,#8b5cf6)":"var(--track)",transition:"background .25s",boxShadow:on?"0 0 12px rgba(99,102,241,0.45)":"none"}}>
      <div style={{position:"absolute",top:3,left:on?22:3,width:22,height:22,borderRadius:"50%",background:"#fff",transition:"left .22s cubic-bezier(.34,1.56,.64,1)",boxShadow:"0 2px 6px rgba(0,0,0,.25)"}}/>
    </div>
  );
}

function NoteCard({n,onEdit,onPin,textColor,mutedColor}) {
  return (
    <div onClick={()=>onEdit(n)} style={{background:n.color+"16",border:`1.5px solid ${n.color}30`,borderRadius:20,padding:"15px",cursor:"pointer",position:"relative",minHeight:110,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",boxShadow:`0 6px 24px ${n.color}14`,transition:"box-shadow .2s"}}>
      <div style={{position:"absolute",top:11,right:11}}>
        <button onClick={e=>{e.stopPropagation();onPin(n.id);}} style={{fontSize:13,opacity:n.pinned?1:.25,transition:"opacity .2s"}}>📌</button>
      </div>
      <div style={{width:9,height:9,borderRadius:"50%",background:n.color,marginBottom:9,boxShadow:`0 0 8px ${n.color}`}}/>
      {n.title&&<div style={{fontSize:14,fontWeight:700,color:textColor,marginBottom:5,paddingRight:22,lineHeight:1.35}}>{n.title}</div>}
      <div style={{fontSize:13,color:mutedColor,lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical"}}>{n.body}</div>
      {(n.tags||[]).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:10}}>
          {n.tags.map(t=><span key={t} style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:99,background:n.color+"28",color:n.color}}>#{t}</span>)}
        </div>
      )}
      <div style={{fontSize:10,color:mutedColor,marginTop:9}}>{fmtKey(n.created)}</div>
    </div>
  );
}

/* ─── Fixed drag-to-reorder hook ───────────────────────────────────────────── */
/* Uses refs for all mutable state read inside event listeners to avoid stale closures */
function useDragList(items, setItems) {
  const [dragState, setDragState] = useState({ dragging:null, overIndex:null, active:false });

  /* live refs — always current inside event handlers */
  const stateRef  = useRef(dragState);
  const itemsRef  = useRef(items);
  const itemRefs  = useRef([]);
  const timerRef  = useRef(null);

  useEffect(() => { stateRef.current  = dragState; }, [dragState]);
  useEffect(() => { itemsRef.current  = items;     }, [items]);

  /* clear stale refs when list length changes */
  useEffect(() => { itemRefs.current = itemRefs.current.slice(0, items.length); }, [items.length]);

  function getIdxFromY(y) {
    let best=null, bestD=Infinity;
    itemRefs.current.forEach((el,i)=>{
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs(y - (r.top + r.height/2));
      if (dist < bestD) { bestD=dist; best=i; }
    });
    return best;
  }

  const handleMove = useCallback((e) => {
    if (!stateRef.current.active) return;
    e.preventDefault();
    const y   = e.touches ? e.touches[0].clientY : e.clientY;
    const idx = getIdxFromY(y);
    if (idx !== null && idx !== stateRef.current.overIndex) {
      setDragState(s => ({ ...s, overIndex:idx }));
    }
  }, []);

  const handleUp = useCallback(() => {
    clearTimeout(timerRef.current);
    const { active, dragging, overIndex } = stateRef.current;
    if (active && dragging !== null && overIndex !== null && dragging !== overIndex) {
      const next = [...itemsRef.current];
      const [moved] = next.splice(dragging, 1);
      next.splice(overIndex, 0, moved);
      setItems(next);
    }
    setDragState({ dragging:null, overIndex:null, active:false });
  }, [setItems]);

  useEffect(() => {
    if (!dragState.active) return;
    window.addEventListener("touchmove",  handleMove, { passive:false });
    window.addEventListener("touchend",   handleUp);
    window.addEventListener("mousemove",  handleMove);
    window.addEventListener("mouseup",    handleUp);
    return () => {
      window.removeEventListener("touchmove",  handleMove);
      window.removeEventListener("touchend",   handleUp);
      window.removeEventListener("mousemove",  handleMove);
      window.removeEventListener("mouseup",    handleUp);
    };
  }, [dragState.active, handleMove, handleUp]);

  function onDown(e, index) {
    /* Only fire from handle — guard against button/checkbox taps bubbling */
    if (e.target && e.target.closest && e.target.closest("button, [data-no-drag]")) return;

    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    let released = false;

    timerRef.current = setTimeout(() => {
      if (released) return;
      if (navigator.vibrate) navigator.vibrate(30);
      setDragState({ dragging:index, overIndex:index, active:true });
      cleanup();
    }, 400);

    function onEarlyRelease() {
      released = true;
      clearTimeout(timerRef.current);
      cleanup();
    }
    function onMove(ev) {
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
      if (Math.abs(y - startY) > 6) {
        released = true;
        clearTimeout(timerRef.current);
        cleanup();
      }
    }
    function cleanup() {
      window.removeEventListener("touchend",  onEarlyRelease);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup",   onEarlyRelease);
      window.removeEventListener("mousemove", onMove);
    }
    window.addEventListener("touchend",  onEarlyRelease, { once:true });
    window.addEventListener("touchmove", onMove,         { passive:true });
    window.addEventListener("mouseup",   onEarlyRelease, { once:true });
    window.addEventListener("mousemove", onMove);
    setTimeout(cleanup, 500);
  }

  function onCancel() {
    clearTimeout(timerRef.current);
    setDragState({ dragging:null, overIndex:null, active:false });
  }

  return {
    dragging:  dragState.dragging,
    overIndex: dragState.overIndex,
    active:    dragState.active,
    onDown,
    onCancel,
    setRef: (i, el) => { itemRefs.current[i] = el; },
  };
}

/* ─── APP ──────────────────────────────────────────────────────────────────── */
export default function App() {

  /* single versioned persisted store */
  const [store, setStoreRaw] = useState(() => loadStore(DEFAULTS));
  const setStore = useCallback((upd) => {
    setStoreRaw(prev => {
      const next = typeof upd === "function" ? upd(prev) : upd;
      saveStore(next);
      return next;
    });
  }, []);
  const setSlice = useCallback((key, upd) => {
    setStore(s => ({ ...s, [key]: typeof upd==="function" ? upd(s[key]) : upd }));
  }, [setStore]);

  const { dark, tasks, weekendTasks, holidayTasks, holidays, dayData, expenses, notes } = store;
  const setDark         = useCallback(v => setSlice("dark",         v), [setSlice]);
  const setTasks        = useCallback(v => setSlice("tasks",        v), [setSlice]);
  const setWeekendTasks = useCallback(v => setSlice("weekendTasks", v), [setSlice]);
  const setHolidayTasks = useCallback(v => setSlice("holidayTasks", v), [setSlice]);
  const setHolidays     = useCallback(v => setSlice("holidays",     v), [setSlice]);
  const setDayData      = useCallback(v => setSlice("dayData",      v), [setSlice]);
  const setExpenses     = useCallback(v => setSlice("expenses",     v), [setSlice]);
  const setNotes        = useCallback(v => setSlice("notes",        v), [setSlice]);

  /* session only */
  const [tab,      setTab]      = useState("today");
  const [viewKey,  setViewKey]  = useState(todayKey);
  const [sheet,    setSheet]    = useState(null);

  /* form helpers */
  const blankExp  = () => ({ amount:"", desc:"", cat:"food", date:todayKey(), note:"", split:false, splitWith:"" });
  const blankTask = () => ({ text:"" });
  const blankNote = () => ({ title:"", body:"", color:"#6366f1", tags:"" });
  const blankPri  = () => ({ text:"", date:todayKey(), reminder:false, reminderHrs:1 });

  /* forms */
  const [taskForm,     setTaskForm]     = useState(blankTask);
  const [editTaskId,   setEditTaskId]   = useState(null);
  const [editTaskMode, setEditTaskMode] = useState("weekday");
  const [expForm,      setExpForm]      = useState(blankExp);
  const [editExpId,    setEditExpId]    = useState(null);
  const [noteForm,     setNoteForm]     = useState(blankNote);
  const [editNoteId,   setEditNoteId]   = useState(null);
  const [priorityForm, setPriorityForm] = useState(blankPri);
  const [remHrs,       setRemHrs]       = useState(1);
  const [remLabel,     setRemLabel]     = useState("");
  const [reminder,     setReminder]     = useState({ active:false, hrs:1, label:"" });
  const [noteSearch,   setNoteSearch]   = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");
  const remRef = useRef(null);

  /* derived */
  const tk       = todayKey();
  const isToday  = viewKey === tk;
  const vWknd    = isWeekend(viewKey);
  const vHoliday = !!(holidays[viewKey]);

  const quote = vHoliday
    ? HOLIDAY_QUOTES[new Date().getDay() % HOLIDAY_QUOTES.length]
    : vWknd
    ? WEEKEND_QUOTES[new Date().getDay() % WEEKEND_QUOTES.length]
    : QUOTES[new Date().getDay() % QUOTES.length];

  const activeTasks = vHoliday ? holidayTasks : vWknd ? weekendTasks : tasks;
  const activeSet   = vHoliday ? "holiday"    : vWknd ? "weekend"    : "weekday";

  const getDay   = useCallback(k => dayData[k] || EMPTY_DAY(), [dayData]);
  const patchDay = useCallback((k, patch) =>
    setDayData(p => ({ ...p, [k]: { ...(p[k]||EMPTY_DAY()), ...patch } }))
  , [setDayData]);

  const curDay = getDay(viewKey);

  const calcPct = useCallback(k => {
    const d = getDay(k);
    const kHol  = !!(holidays[k]);
    const kWknd = isWeekend(k);
    const base  = kHol ? holidayTasks : kWknd ? weekendTasks : tasks;
    const total = base.length + (d.extra||[]).length + (d.special||[]).length;
    if (!total) return 0;
    const done = base.filter(t => d.checks?.[t.id]).length
               + (d.extra||[]).filter(x => x.done).length
               + (d.special||[]).filter(x => x.done).length;
    return Math.round((done / total) * 100);
  }, [getDay, holidays, holidayTasks, weekendTasks, tasks]);

  const viewPct   = calcPct(viewKey);
  const totalView = activeTasks.length + (curDay.extra||[]).length + (curDay.special||[]).length;
  const doneView  = activeTasks.filter(t => curDay.checks?.[t.id]).length
                  + (curDay.extra||[]).filter(x => x.done).length
                  + (curDay.special||[]).filter(x => x.done).length;

  /* expenses */
  const sortedExp  = [...expenses].sort((a,b) => b.date.localeCompare(a.date));
  const monthPfx   = currMonthPfx();
  const monthExp   = sortedExp.filter(e => e.date.startsWith(monthPfx));
  const totalMonth = monthExp.reduce((s,e) => s+e.amount, 0);
  const todayExp   = sortedExp.filter(e => e.date===tk).reduce((s,e) => s+e.amount, 0);
  const expByCat   = EXP_CATS.map(c => ({ ...c, total:monthExp.filter(e=>e.cat===c.id).reduce((s,e)=>s+e.amount,0) })).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const splitExp   = sortedExp.filter(e => e.split);
  const days7      = past7(viewKey);
  const expTrend   = days7.map(k => ({ label:fmtShort(k), amt:sortedExp.filter(e=>e.date===k).reduce((s,e)=>s+e.amount,0) }));
  const taskTrend  = days7.map(k => ({ label:fmtShort(k), pct:calcPct(k) }));

  function groupByDate(list) {
    const g = {};
    list.forEach(e => { if (!g[e.date]) g[e.date]=[]; g[e.date].push(e); });
    return Object.entries(g).sort((a,b) => b[0].localeCompare(a[0]));
  }
  const expGroups = groupByDate(sortedExp.slice(0,80));

  const filteredNotes = notes
    .filter(n => !noteSearch
      || n.title.toLowerCase().includes(noteSearch.toLowerCase())
      || n.body.toLowerCase().includes(noteSearch.toLowerCase())
      || (n.tags||[]).some(t => t.toLowerCase().includes(noteSearch.toLowerCase()))
    )
    .sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));

  /* three independent drag controllers */
  const dragW  = useDragList(tasks,        setTasks);
  const dragWE = useDragList(weekendTasks, setWeekendTasks);
  const dragH  = useDragList(holidayTasks, setHolidayTasks);
  const activeDrag = vHoliday ? dragH : vWknd ? dragWE : dragW;

  /* ── actions ──────────────────────────────────────────────────────────────── */
  const openAddTask  = (mode)   => { setTaskForm(blankTask()); setEditTaskId(null);  setEditTaskMode(mode); setSheet("task"); };
  const openEditTask = (t,mode) => { setTaskForm({text:t.text}); setEditTaskId(t.id); setEditTaskMode(mode); setSheet("task"); };

  function saveTask() {
    if (!taskForm.text.trim()) return;
    const setter = editTaskMode==="holiday" ? setHolidayTasks : editTaskMode==="weekend" ? setWeekendTasks : setTasks;
    if (editTaskId) setter(p => p.map(t => t.id===editTaskId ? {...t, text:taskForm.text.trim()} : t));
    else            setter(p => [...p, {id:Date.now(), text:taskForm.text.trim()}]);
    setEditTaskId(null); setSheet(null);
  }

  function deleteTask(id, mode) {
    const setter = mode==="holiday" ? setHolidayTasks : mode==="weekend" ? setWeekendTasks : setTasks;
    setter(p => p.filter(t => t.id !== id));
  }

  function toggleHoliday() {
    if (vHoliday) { setHolidays(h => { const n={...h}; delete n[viewKey]; return n; }); }
    else          { setSheet("markHoliday"); }
  }
  function confirmHoliday() {
    setHolidays(h => ({ ...h, [viewKey]: holidayLabel || "Holiday" }));
    setHolidayLabel(""); setSheet(null);
  }

  const openAddExp  = () => { setExpForm(blankExp()); setEditExpId(null); setSheet("expense"); };
  const openEditExp = (e) => { setExpForm({amount:String(e.amount),desc:e.desc,cat:e.cat,date:e.date,note:e.note,split:e.split,splitWith:e.splitWith}); setEditExpId(e.id); setSheet("expense"); };
  function saveExp() {
    if (!expForm.amount || !expForm.desc.trim()) return;
    if (editExpId) setExpenses(p => p.map(e => e.id===editExpId ? {...e,...expForm,amount:+expForm.amount} : e));
    else           setExpenses(p => [{...expForm, id:Date.now(), amount:+expForm.amount}, ...p]);
    setEditExpId(null); setExpForm(blankExp()); setSheet(null);
  }
  function deleteExp(id) { setExpenses(p => p.filter(e => e.id!==id)); setSheet(null); }

  const openAddNote  = () => { setNoteForm(blankNote()); setEditNoteId(null); setSheet("note"); };
  const openEditNote = (n) => { setNoteForm({title:n.title,body:n.body,color:n.color,tags:(n.tags||[]).join(", ")}); setEditNoteId(n.id); setSheet("note"); };
  function saveNote() {
    if (!noteForm.body.trim()) return;
    const tags = noteForm.tags.split(",").map(t=>t.trim()).filter(Boolean);
    if (editNoteId) setNotes(p => p.map(n => n.id===editNoteId ? {...n,...noteForm,tags} : n));
    else            setNotes(p => [{id:Date.now(),title:noteForm.title,body:noteForm.body,color:noteForm.color,pinned:false,created:todayKey(),tags}, ...p]);
    setEditNoteId(null); setNoteForm(blankNote()); setSheet(null);
  }
  function deleteNote(id) { setNotes(p => p.filter(n => n.id!==id)); setSheet(null); }
  function pinNote(id)    { setNotes(p => p.map(n => n.id===id ? {...n,pinned:!n.pinned} : n)); }

  function startReminder() {
    if (remRef.current) clearTimeout(remRef.current);
    remRef.current = setTimeout(() => { alert(`⏰ ${remLabel||"Check your tasks!"}`); setReminder(r=>({...r,active:false})); }, remHrs*3600*1000);
    setReminder({active:true,hrs:remHrs,label:remLabel}); setSheet(null);
  }
  function cancelReminder() { if(remRef.current) clearTimeout(remRef.current); setReminder({active:false,hrs:1,label:""}); }
  function scheduleReminder(text,hrs) { setTimeout(()=>alert(`⏰ Reminder: "${text}"`), hrs*3600*1000); }

  /* ── theme ────────────────────────────────────────────────────────────────── */
  const dayAccent = vHoliday
    ? { a:"#f43f8e", b:"#fb7185", grad:"linear-gradient(135deg,#f43f8e,#fb7185)" }
    : vWknd
    ? { a:"#10d9a0", b:"#06b6d4", grad:"linear-gradient(135deg,#10d9a0,#06b6d4)" }
    : { a:"#6366f1", b:"#8b5cf6", grad:"linear-gradient(135deg,#6366f1,#8b5cf6)" };

  const bg      = dark ? "#08080f"                     : "#f0f1fa";
  const card    = dark ? "rgba(24,24,36,0.72)"         : "rgba(255,255,255,0.72)";
  const sheetBg = dark ? "rgba(16,16,26,0.96)"         : "rgba(248,248,255,0.96)";
  const glass   = dark ? "rgba(24,24,36,0.88)"         : "rgba(255,255,255,0.9)";
  const gBorder = dark ? "rgba(255,255,255,0.1)"       : "rgba(255,255,255,0.75)";
  const tc      = dark ? "#f0f0ff"                     : "#0f0f1a";
  const muted   = dark ? "#7070a0"                     : "#8080b0";
  const border  = dark ? "rgba(255,255,255,0.08)"      : "rgba(99,102,241,0.1)";
  const inp     = dark ? "rgba(255,255,255,0.06)"      : "rgba(99,102,241,0.05)";
  const track   = dark ? "rgba(255,255,255,0.1)"       : "rgba(0,0,0,0.08)";
  const pill    = dark ? "rgba(255,255,255,0.15)"      : "rgba(0,0,0,0.18)";

  const bgGrad = dark
    ? `radial-gradient(ellipse 80% 50% at 50% -10%,${dayAccent.a}18 0%,transparent 70%),radial-gradient(ellipse 60% 40% at 90% 110%,${dayAccent.b}12 0%,transparent 70%),#08080f`
    : `radial-gradient(ellipse 80% 50% at 50% -10%,${dayAccent.a}22 0%,transparent 70%),radial-gradient(ellipse 60% 40% at 90% 110%,${dayAccent.b}16 0%,transparent 70%),#f0f1fa`;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    :root{
      --bg:${bg};--card:${card};--sheet-bg:${sheetBg};
      --glass:${glass};--glass-border:${gBorder};
      --text:${tc};--muted:${muted};--border:${border};
      --inp:${inp};--track:${track};--pill:${pill};
      --accent-a:${dayAccent.a};--accent-b:${dayAccent.b};
    }
    html,body{background:${bgGrad};color:var(--text);font-family:'DM Sans',system-ui,sans-serif;font-size:15px;line-height:1.5;max-width:430px;margin:0 auto;min-height:100vh}
    input,select,textarea{background:var(--inp);border:1.5px solid var(--border);border-radius:14px;color:var(--text);padding:13px 15px;font-size:15px;width:100%;outline:none;font-family:inherit;transition:border-color .18s,box-shadow .18s;-webkit-appearance:none;appearance:none}
    input:focus,select:focus,textarea:focus{border-color:var(--accent-a);box-shadow:0 0 0 3px ${dayAccent.a}20}
    textarea{resize:vertical}
    button{cursor:pointer;font-family:inherit;border:none;outline:none;background:none}
    .card{background:var(--card);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-radius:22px;padding:18px;border:1px solid var(--glass-border);box-shadow:0 2px 20px rgba(0,0,0,0.07),inset 0 1px 0 rgba(255,255,255,0.2)}
    .btn-a{background:${dayAccent.grad};color:#fff;border-radius:16px;padding:15px;font-size:15px;font-weight:600;width:100%;display:block;box-shadow:0 6px 20px ${dayAccent.a}44;transition:opacity .15s,transform .12s;text-align:center}
    .btn-a:active{opacity:.84;transform:scale(.98)}
    .btn-red{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border-radius:16px;padding:15px;font-size:15px;font-weight:600;width:100%;display:block;box-shadow:0 6px 20px rgba(239,68,68,.35);transition:opacity .15s,transform .12s;text-align:center}
    .btn-red:active{opacity:.84;transform:scale(.98)}
    .dash{background:var(--card);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1.5px dashed var(--border);border-radius:16px;padding:14px;font-size:13px;font-weight:600;color:var(--muted);display:flex;align-items:center;justify-content:center;gap:7px;width:100%;box-shadow:inset 0 1px 0 rgba(255,255,255,0.15)}
    ::-webkit-scrollbar{display:none}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    .fade{animation:fadeIn .32s ease}
    .drag-over{background:rgba(99,102,241,0.1)!important;border-radius:14px}
    .drag-ghost{opacity:.38;transform:scale(.97)}
  `;

  /* ── inner components (need closure access — defined before return) ─────── */

  function DayNav() {
    const future = viewKey > tk;
    const dow    = getDow(viewKey);
    const dayBadge = vHoliday
      ? { label:holidays[viewKey]||"Holiday", color:"#f43f8e", bg:"rgba(244,63,142,0.13)" }
      : vWknd
      ? { label:dow===0?"Sunday":"Saturday",  color:"#10d9a0", bg:"rgba(16,217,160,0.13)" }
      : null;

    return (
      <div style={{background:card,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderRadius:18,border:`1px solid ${gBorder}`,overflow:"hidden",marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.2)"}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <button onClick={()=>setViewKey(k=>offsetKey(k,-1))} style={{padding:"13px 18px",color:muted,fontSize:22,lineHeight:1,flexShrink:0}}>‹</button>
          <div style={{flex:1,textAlign:"center",padding:"10px 4px"}}>
            <div style={{fontSize:15,fontWeight:700,color:tc,lineHeight:1.2}}>{isToday?"Today":fmtKey(viewKey)}</div>
            {dayBadge&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:4,background:dayBadge.bg,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:600,color:dayBadge.color}}>
                {vHoliday?"🎉":"🌅"} {dayBadge.label}
              </div>
            )}
          </div>
          <button onClick={()=>setViewKey(k=>offsetKey(k,1))} disabled={future} style={{padding:"13px 18px",color:future?"transparent":muted,fontSize:22,lineHeight:1,flexShrink:0}}>›</button>
        </div>
        <div style={{borderTop:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:vHoliday?`${dayAccent.a}10`:"transparent"}}>
          <span style={{fontSize:13,fontWeight:500,color:vHoliday?dayAccent.a:muted}}>
            {vHoliday?`🎉 ${holidays[viewKey]}`:"Mark as holiday / day-off"}
          </span>
          <Toggle on={vHoliday} onChange={toggleHoliday}/>
        </div>
        {!isToday&&(
          <button onClick={()=>setViewKey(tk)} style={{width:"100%",padding:"9px",fontSize:12,fontWeight:600,color:dayAccent.a,borderTop:`1px solid ${border}`,background:`${dayAccent.a}08`,display:"block",textAlign:"center"}}>← Back to Today</button>
        )}
      </div>
    );
  }

  function TaskList({ taskArr, dragCtrl, mode, label, accentColor, dayKey }) {
    const dData = getDay(dayKey);
    return (
      <div className="card" style={{marginBottom:12,borderTop:`3px solid ${accentColor}`}}>
        <Sec action={
          <button onClick={()=>openAddTask(mode)} style={{background:`${accentColor}18`,color:accentColor,border:`1px solid ${accentColor}40`,borderRadius:10,padding:"5px 13px",fontSize:12,fontWeight:600}}>+ Add</button>
        }>
          {label}
        </Sec>
        {dragCtrl.active && (
          <div style={{fontSize:11,color:accentColor,marginBottom:8,fontWeight:500,textAlign:"center"}}>Release to drop ↕</div>
        )}
        {taskArr.length === 0 && (
          <div style={{textAlign:"center",padding:"16px 0",color:muted,fontSize:14}}>No tasks yet — add some!</div>
        )}
        {taskArr.map((t,i) => {
          const isDragging  = dragCtrl.dragging  === i;
          const isDropTarget= dragCtrl.overIndex === i && dragCtrl.active && dragCtrl.dragging !== i;
          return (
            <div
              key={t.id}
              ref={el => dragCtrl.setRef(i, el)}
              onTouchCancel={dragCtrl.onCancel}
              className={isDragging ? "drag-ghost" : isDropTarget ? "drag-over" : ""}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"11px 4px",
                borderBottom: i < taskArr.length-1 ? `1px solid ${border}` : "none",
                transition:"opacity .15s,background .15s",
                userSelect:"none",
              }}
            >
              {/* drag handle only — onDown fires here, not on whole row */}
              <span
                onTouchStart={e => { e.stopPropagation(); dragCtrl.onDown(e, i); }}
                onMouseDown={e  => { e.stopPropagation(); dragCtrl.onDown(e, i); }}
                style={{color:muted,fontSize:17,cursor:"grab",padding:"4px 6px",flexShrink:0,lineHeight:1,touchAction:"none",userSelect:"none"}}
              >⠿</span>
              <Checkbox
                checked={!!dData.checks?.[t.id]}
                onChange={() => patchDay(dayKey, {checks:{...dData.checks,[t.id]:!dData.checks?.[t.id]}})}
                color={accentColor}
              />
              <span style={{flex:1,fontSize:15,textDecoration:dData.checks?.[t.id]?"line-through":"none",color:dData.checks?.[t.id]?muted:tc,transition:"all .2s"}}>
                {t.text}
              </span>
              <button onClick={()=>openEditTask(t,mode)} style={{color:muted,fontSize:12,padding:"2px 7px",border:`1px solid ${border}`,borderRadius:7,lineHeight:1.6,flexShrink:0}}>✏️</button>
              <button onClick={()=>deleteTask(t.id,mode)} style={{color:muted,fontSize:18,lineHeight:1,flexShrink:0,padding:"0 2px"}}>×</button>
            </div>
          );
        })}
        {taskArr.length > 1 && (
          <div style={{fontSize:11,color:muted,marginTop:8,textAlign:"center",opacity:.7}}>Long press ⠿ to reorder</div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{css}</style>
      <div style={{paddingBottom:90}}>

        {/* Header */}
        <div style={{padding:"52px 20px 0",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,color:muted,fontWeight:500}}>{fmtKey(tk)}</div>
            <div style={{fontSize:25,fontWeight:700,marginTop:2,letterSpacing:-.5,background:dayAccent.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              {getGreeting()} {vHoliday?"🎉":vWknd?"🌅":"👋"}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            {reminder.active&&(
              <div style={{background:`${dayAccent.a}18`,border:`1px solid ${dayAccent.a}44`,backdropFilter:"blur(20px)",borderRadius:12,padding:"6px 10px",fontSize:12,fontWeight:600,color:dayAccent.a,display:"flex",alignItems:"center",gap:4}}>
                ⏰{reminder.hrs}hr
                <button onClick={cancelReminder} style={{color:muted,fontSize:16,paddingLeft:2}}>×</button>
              </div>
            )}
            <button onClick={()=>setDark(d=>!d)} style={{background:card,backdropFilter:"blur(28px)",border:`1px solid ${gBorder}`,borderRadius:13,width:40,height:40,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.2)"}}>
              {dark?"☀️":"🌙"}
            </button>
          </div>
        </div>

        {/* Quote */}
        <div style={{padding:"12px 20px 0"}}>
          <div style={{background:`linear-gradient(135deg,${dayAccent.a}ee,${dayAccent.b}ee)`,backdropFilter:"blur(20px)",borderRadius:20,padding:"13px 18px",border:"1px solid rgba(255,255,255,0.2)",boxShadow:`0 8px 28px ${dayAccent.a}28`}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.92)",fontStyle:"italic",lineHeight:1.6}}>"{quote[0]}"</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:3}}>— {quote[1]}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{padding:"12px 20px 0",display:"flex",gap:6}}>
          {[["today","Today"],["stats","Stats"],["expenses","Wallet"],["notes","Notes"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px 4px",borderRadius:14,fontSize:13,fontWeight:600,background:tab===id?dayAccent.grad:card,color:tab===id?"#fff":muted,border:`1px solid ${tab===id?"transparent":gBorder}`,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",boxShadow:tab===id?`0 4px 16px ${dayAccent.a}44`:"0 2px 6px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.15)",transition:"all .22s"}}>
              {label}
            </button>
          ))}
        </div>

        {/* Page */}
        <div style={{padding:"12px 20px 0"}} className="fade" key={tab}>

          {/* ═══ TODAY ════════════════════════════════════════════════════ */}
          {tab==="today"&&(
            <>
              <DayNav/>

              {/* Progress */}
              <div className="card" style={{display:"flex",gap:16,alignItems:"center",marginBottom:12}}>
                <Ring pct={viewPct} size={76} stroke={7} color={dayAccent.a}>
                  <span style={{fontSize:16,fontWeight:700,color:dayAccent.a}}>{viewPct}%</span>
                </Ring>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:17,fontWeight:700}}>{doneView}/{totalView} done</div>
                  <div style={{fontSize:12,color:muted,marginTop:1}}>{vHoliday?"🎉 Holiday":vWknd?"🌅 Weekend":"📋 Weekday"} · {viewPct===100?"All done! 🎉":viewPct>=50?"Halfway 💪":"Let's go 🚀"}</div>
                  <div style={{marginTop:8,height:5,background:track,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${viewPct}%`,background:dayAccent.grad,borderRadius:99,transition:"width .5s ease",boxShadow:`0 0 8px ${dayAccent.a}77`}}/>
                  </div>
                </div>
              </div>

              <TaskList taskArr={activeTasks} dragCtrl={activeDrag} mode={activeSet} label={vHoliday?"🎉 Holiday tasks":vWknd?"🌅 Weekend tasks":"📋 Daily tasks"} accentColor={dayAccent.a} dayKey={viewKey}/>

              {/* Extra tasks */}
              {(curDay.extra||[]).length>0&&(
                <div className="card" style={{marginBottom:12}}>
                  <Sec>Extra tasks</Sec>
                  {(curDay.extra||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:i<curDay.extra.length-1?`1px solid ${border}`:"none"}}>
                      <Checkbox checked={t.done} color="#06b6d4" onChange={()=>{const a=[...curDay.extra];a[i]={...a[i],done:!a[i].done};patchDay(viewKey,{extra:a});}}/>
                      <span style={{flex:1,fontSize:15,textDecoration:t.done?"line-through":"none",color:t.done?muted:tc}}>{t.text}</span>
                      <button onClick={()=>{const a=[...curDay.extra];a.splice(i,1);patchDay(viewKey,{extra:a});}} style={{color:muted,fontSize:18,lineHeight:1,padding:"0 2px"}}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Priority tasks */}
              {(curDay.special||[]).length>0&&(
                <div className="card" style={{marginBottom:12,border:"1px solid rgba(239,68,68,0.2)"}}>
                  <Sec>⭐ Priority tasks</Sec>
                  {(curDay.special||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:i<curDay.special.length-1?`1px solid ${border}`:"none"}}>
                      <Checkbox checked={t.done} color="#ef4444" onChange={()=>{const a=[...curDay.special];a[i]={...a[i],done:!a[i].done};patchDay(viewKey,{special:a});}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,textDecoration:t.done?"line-through":"none",color:t.done?muted:tc}}>{t.text}</div>
                        {t.dueDate&&t.dueDate!==viewKey&&<div style={{fontSize:11,color:"#ef4444",marginTop:2}}>Due {fmtKey(t.dueDate)}</div>}
                      </div>
                      <button onClick={()=>{const a=[...curDay.special];a.splice(i,1);patchDay(viewKey,{special:a});}} style={{color:muted,fontSize:18,lineHeight:1,padding:"0 2px"}}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <button className="dash" onClick={()=>{setTaskForm(blankTask());setSheet("addExtra");}}>+ Extra task</button>
                <button onClick={()=>setSheet("addPriority")} style={{background:card,backdropFilter:"blur(28px)",border:"1.5px dashed rgba(239,68,68,.28)",borderRadius:16,padding:"14px",fontSize:13,fontWeight:600,color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"inset 0 1px 0 rgba(255,255,255,.12)"}}>⭐ Priority</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button className="dash" onClick={()=>setSheet("dayNote")}>📝 {curDay.note?"Edit note":"Day note"}</button>
                <button onClick={()=>setSheet("reminder")} style={{background:reminder.active?`${dayAccent.a}14`:card,backdropFilter:"blur(28px)",border:`1px solid ${reminder.active?dayAccent.a:gBorder}`,borderRadius:16,padding:"14px",fontSize:13,fontWeight:600,color:reminder.active?dayAccent.a:muted,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:reminder.active?`0 0 12px ${dayAccent.a}28`:"inset 0 1px 0 rgba(255,255,255,.12)"}}>
                  ⏰ {reminder.active?`${reminder.hrs}hr set`:"Reminder"}
                </button>
              </div>

              {curDay.note&&(
                <div className="card" style={{marginTop:12,borderLeft:`3px solid ${dayAccent.a}`,boxShadow:`0 4px 16px ${dayAccent.a}12`}}>
                  <div style={{fontSize:11,fontWeight:600,color:dayAccent.a,marginBottom:6,textTransform:"uppercase",letterSpacing:.6}}>Day note</div>
                  <div style={{fontSize:14,color:tc,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{curDay.note}</div>
                </div>
              )}
            </>
          )}

          {/* ═══ STATS ════════════════════════════════════════════════════ */}
          {tab==="stats"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {[
                  {label:"7-day avg",val:Math.round(taskTrend.reduce((s,x)=>s+x.pct,0)/7)+"%",sub:"completion",color:dayAccent.a},
                  {label:"Best day", val:taskTrend.reduce((a,c)=>c.pct>a.pct?c:a,taskTrend[0]).pct+"%",sub:"peak",color:"#10d9a0"},
                  {label:"Today",    val:"₹"+todayExp.toLocaleString(),sub:"spent",color:"#ff6b35"},
                  {label:"Month",    val:"₹"+totalMonth.toLocaleString(),sub:"total",color:"#f43f8e"},
                ].map(s=>(
                  <div key={s.label} className="card">
                    <div style={{fontSize:11,color:muted,fontWeight:600,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>{s.label}</div>
                    <div style={{fontSize:22,fontWeight:700,color:s.color,textShadow:`0 0 16px ${s.color}44`}}>{s.val}</div>
                    <div style={{fontSize:12,color:muted,marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{marginBottom:12}}>
                <Sec>7-day completion</Sec>
                <ResponsiveContainer width="100%" height={155}>
                  <AreaChart data={taskTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <defs>
                      <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={dayAccent.a} stopOpacity={0.35}/>
                        <stop offset="100%" stopColor={dayAccent.a} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:muted}} tickLine={false} axisLine={false}/>
                    <YAxis domain={[0,100]} tick={{fontSize:10,fill:muted}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{background:glass,border:`1px solid ${gBorder}`,borderRadius:12,fontSize:12,color:tc}} formatter={v=>[v+"%","Done"]}/>
                    <Area type="monotone" dataKey="pct" stroke={dayAccent.a} strokeWidth={2.5} fill="url(#agrad)" dot={{fill:dayAccent.a,r:4,strokeWidth:0}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <Sec>Daily log</Sec>
                {days7.slice().reverse().map(k=>{
                  const p=calcPct(k), nd=getDay(k), kHol=!!(holidays[k]), kWknd=isWeekend(k);
                  return (
                    <div key={k} onClick={()=>{setViewKey(k);setTab("today");}} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${border}`,cursor:"pointer"}}>
                      <Ring pct={p} size={44} stroke={4} color={pctColor(p)}>
                        <span style={{fontSize:9,fontWeight:700,color:pctColor(p)}}>{p}%</span>
                      </Ring>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600}}>{kHol?"🎉":kWknd?"🌅":""} {fmtKey(k)}{k===tk?" · Today":""}</div>
                        <div style={{fontSize:12,color:muted,marginTop:1}}>{nd.note?"Has note · ":""}{kHol?"Holiday":kWknd?"Weekend":"Weekday"}</div>
                      </div>
                      <span style={{fontSize:13,color:muted}}>›</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ═══ WALLET ═══════════════════════════════════════════════════ */}
          {tab==="expenses"&&(
            <>
              <div style={{background:"linear-gradient(135deg,rgba(16,10,60,.95),rgba(40,20,100,.95))",backdropFilter:"blur(28px)",border:"1px solid rgba(99,102,241,.28)",borderRadius:24,padding:"22px",marginBottom:12,boxShadow:"0 12px 48px rgba(99,102,241,.22),inset 0 1px 0 rgba(255,255,255,.08)"}}>
                <div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>This month</div>
                <div style={{fontSize:38,fontWeight:700,color:"#fff",letterSpacing:-1.5,margin:"6px 0 4px"}}>₹{totalMonth.toLocaleString()}</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>{monthExp.length} transactions</div>
                <div style={{display:"flex",gap:22,marginTop:18}}>
                  {[{label:"Today",val:"₹"+todayExp.toLocaleString()},{label:"Avg/day",val:"₹"+(monthExp.length?Math.round(totalMonth/new Date().getDate()):0).toLocaleString()},{label:"Splitwise",val:splitExp.length+" items"}].map(s=>(
                    <div key={s.label}>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>{s.label}</div>
                      <div style={{fontSize:14,fontWeight:600,color:"#fff",marginTop:2}}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="dash" onClick={openAddExp} style={{marginBottom:12,color:dayAccent.a,borderColor:`${dayAccent.a}38`}}>+ Add expense</button>

              {splitExp.length>0&&(
                <div className="card" style={{marginBottom:12,border:"1px solid rgba(99,102,241,.18)"}}>
                  <Sec>🤝 Split expenses</Sec>
                  {splitExp.map((e,i)=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<splitExp.length-1?`1px solid ${border}`:"none"}}>
                      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:catColor(e.cat)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{catIcon(e.cat)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</div>
                        <div style={{fontSize:11,color:muted}}>with {e.splitWith}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#6366f1"}}>₹{(e.amount/2).toLocaleString()}</div>
                        <div style={{fontSize:10,color:muted}}>your share</div>
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13,color:muted}}>Total owed / owing</span>
                    <span style={{fontSize:15,fontWeight:700,color:"#6366f1"}}>₹{(splitExp.reduce((s,e)=>s+e.amount,0)/2).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Bar chart — using Cell for per-bar color so gradient works reliably */}
              {expTrend.some(x=>x.amt>0)&&(
                <div className="card" style={{marginBottom:12}}>
                  <Sec>Spending — 7 days</Sec>
                  <ResponsiveContainer width="100%" height={135}>
                    <BarChart data={expTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:muted}} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:10,fill:muted}} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{background:glass,border:`1px solid ${gBorder}`,borderRadius:12,fontSize:12,color:tc}} formatter={v=>["₹"+v,"Spent"]}/>
                      <Bar dataKey="amt" radius={[6,6,0,0]}>
                        {expTrend.map((_,i)=><Cell key={i} fill={dayAccent.a}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {expByCat.length>0&&(
                <div className="card" style={{marginBottom:12}}>
                  <Sec>By category</Sec>
                  {expByCat.map(c=>(
                    <div key={c.id} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:14}}>
                        <span>{c.icon} {c.label}</span>
                        <span style={{fontWeight:600}}>₹{c.total.toLocaleString()}</span>
                      </div>
                      <div style={{height:5,background:track,borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.round((c.total/totalMonth)*100)}%`,background:`linear-gradient(90deg,${c.color},${c.color}cc)`,borderRadius:99,transition:"width .4s ease",boxShadow:`0 0 6px ${c.color}44`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expGroups.length===0&&(
                <div className="card" style={{textAlign:"center",padding:"28px 0",color:muted}}>
                  <div style={{fontSize:34,marginBottom:8}}>💸</div>No expenses yet
                </div>
              )}
              {expGroups.map(([date,exps])=>(
                <div key={date} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingLeft:4}}>
                    <span style={{fontSize:11,fontWeight:600,color:muted,textTransform:"uppercase",letterSpacing:.7}}>{date===tk?"Today":date===offsetKey(tk,-1)?"Yesterday":fmtKey(date)}</span>
                    <span style={{fontSize:12,fontWeight:600,color:dayAccent.a}}>₹{exps.reduce((s,e)=>s+e.amount,0).toLocaleString()}</span>
                  </div>
                  <div className="card" style={{padding:"4px 16px"}}>
                    {exps.map((e,i)=>(
                      <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<exps.length-1?`1px solid ${border}`:"none"}}>
                        <div style={{width:44,height:44,borderRadius:13,flexShrink:0,background:catColor(e.cat)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>{catIcon(e.cat)}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</div>
                          <div style={{fontSize:12,color:muted,marginTop:1,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                            <span>{catLabel(e.cat)}</span>
                            {e.split&&<span style={{background:`${dayAccent.a}18`,color:dayAccent.a,borderRadius:6,padding:"0 6px",fontSize:10,fontWeight:600}}>÷ {e.splitWith}</span>}
                          </div>
                          {e.note&&<div style={{fontSize:11,color:muted,marginTop:1,fontStyle:"italic"}}>{e.note}</div>}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:15,fontWeight:700,color:"#ef4444"}}>₹{e.amount.toLocaleString()}</div>
                          {e.split&&<div style={{fontSize:10,color:dayAccent.a}}>₹{(e.amount/2).toLocaleString()} each</div>}
                          <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:4}}>
                            <button onClick={()=>openEditExp(e)} style={{fontSize:11,color:dayAccent.a,fontWeight:600,border:`1px solid ${dayAccent.a}38`,borderRadius:6,padding:"2px 8px"}}>Edit</button>
                            <button onClick={()=>deleteExp(e.id)} style={{fontSize:11,color:muted}}>Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ═══ NOTES ════════════════════════════════════════════════════ */}
          {tab==="notes"&&(
            <>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <div style={{flex:1,position:"relative"}}>
                  <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,color:muted}}>🔍</span>
                  <input value={noteSearch} onChange={e=>setNoteSearch(e.target.value)} placeholder="Search notes, tags..." style={{paddingLeft:38}}/>
                </div>
                <button onClick={openAddNote} style={{background:dayAccent.grad,color:"#fff",borderRadius:14,padding:"0 20px",fontSize:20,fontWeight:600,flexShrink:0,boxShadow:`0 4px 16px ${dayAccent.a}44`}}>+</button>
              </div>

              {filteredNotes.length===0&&(
                <div style={{textAlign:"center",padding:"52px 0",color:muted}}>
                  <div style={{fontSize:44,marginBottom:12}}>📝</div>
                  <div style={{fontSize:15,fontWeight:600}}>{noteSearch?"No results":"No notes yet"}</div>
                  <div style={{fontSize:13,marginTop:4}}>{noteSearch?"Try a different search":"Tap + to write your first"}</div>
                </div>
              )}

              {filteredNotes.filter(n=>n.pinned).length>0&&(
                <>
                  <div style={{fontSize:11,fontWeight:600,color:muted,textTransform:"uppercase",letterSpacing:.7,marginBottom:8}}>📌 Pinned</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    {filteredNotes.filter(n=>n.pinned).map(n=><NoteCard key={n.id} n={n} onEdit={openEditNote} onPin={pinNote} textColor={tc} mutedColor={muted}/>)}
                  </div>
                </>
              )}
              {filteredNotes.filter(n=>!n.pinned).length>0&&(
                <>
                  {filteredNotes.filter(n=>n.pinned).length>0&&<div style={{fontSize:11,fontWeight:600,color:muted,textTransform:"uppercase",letterSpacing:.7,marginBottom:8}}>All notes</div>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {filteredNotes.filter(n=>!n.pinned).map(n=><NoteCard key={n.id} n={n} onEdit={openEditNote} onPin={pinNote} textColor={tc} mutedColor={muted}/>)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════ SHEETS ══════════════════════════════════════════ */}

      <Sheet open={sheet==="markHoliday"} onClose={()=>setSheet(null)} title="🎉 Mark as holiday">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input value={holidayLabel} onChange={e=>setHolidayLabel(e.target.value)} placeholder="e.g. Diwali, Birthday, Day-off..." autoFocus/>
          <button className="btn-a" onClick={confirmHoliday}>Mark as holiday</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="task"} onClose={()=>setSheet(null)} title={editTaskId?"Edit task":`Add ${editTaskMode} task`}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input value={taskForm.text} onChange={e=>setTaskForm(p=>({...p,text:e.target.value}))} placeholder="Task description..." autoFocus/>
          <button className="btn-a" onClick={saveTask}>{editTaskId?"Save changes":"Add task"}</button>
          {editTaskId&&<button onClick={()=>{deleteTask(editTaskId,editTaskMode);setSheet(null);}} style={{color:"#ef4444",fontSize:14,fontWeight:600,padding:8,textAlign:"center"}}>Delete task</button>}
        </div>
      </Sheet>

      <Sheet open={sheet==="addExtra"} onClose={()=>setSheet(null)} title="Extra task for today">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input value={taskForm.text} onChange={e=>setTaskForm(p=>({...p,text:e.target.value}))} placeholder="What extra task for this day?" autoFocus/>
          <button className="btn-a" onClick={()=>{if(!taskForm.text.trim())return;patchDay(viewKey,{extra:[...(curDay.extra||[]),{text:taskForm.text.trim(),done:false}]});setTaskForm(blankTask());setSheet(null);}}>Add</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="addPriority"} onClose={()=>setSheet(null)} title="⭐ Priority task">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><Lbl>Task</Lbl><input value={priorityForm.text} onChange={e=>setPriorityForm(p=>({...p,text:e.target.value}))} placeholder="What's the priority?" autoFocus/></div>
          <div><Lbl>Due date</Lbl><input type="date" value={priorityForm.date} onChange={e=>setPriorityForm(p=>({...p,date:e.target.value}))}/></div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:inp,borderRadius:14,padding:"14px 15px"}}>
            <div><div style={{fontSize:15,fontWeight:500}}>Set reminder</div><div style={{fontSize:12,color:muted}}>Notify before due time</div></div>
            <Toggle on={priorityForm.reminder} onChange={()=>setPriorityForm(p=>({...p,reminder:!p.reminder}))}/>
          </div>
          {priorityForm.reminder&&(
            <div><Lbl>Remind me in</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[1,3,5].map(h=>(
                  <button key={h} onClick={()=>setPriorityForm(p=>({...p,reminderHrs:h}))} style={{padding:"13px 0",borderRadius:14,background:priorityForm.reminderHrs===h?"linear-gradient(135deg,#ef4444,#dc2626)":inp,border:`1.5px solid ${priorityForm.reminderHrs===h?"#ef4444":border}`,color:priorityForm.reminderHrs===h?"#fff":tc,fontSize:16,fontWeight:700,transition:"all .15s",boxShadow:priorityForm.reminderHrs===h?"0 4px 12px rgba(239,68,68,.4)":"none"}}>
                    {h}<span style={{fontSize:12,fontWeight:500}}>h</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="btn-red" onClick={()=>{if(!priorityForm.text.trim())return;const task={text:priorityForm.text.trim(),done:false,dueDate:priorityForm.date};patchDay(priorityForm.date,{special:[...(getDay(priorityForm.date).special||[]),task]});if(priorityForm.reminder)scheduleReminder(priorityForm.text.trim(),priorityForm.reminderHrs);setPriorityForm(blankPri());setSheet(null);}}>Add priority task</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="dayNote"} onClose={()=>setSheet(null)} title="Day note">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <textarea value={curDay.note||""} onChange={e=>patchDay(viewKey,{note:e.target.value})} placeholder="Thoughts, reflections, how was your day..." rows={7} autoFocus/>
          <button className="btn-a" onClick={()=>setSheet(null)}>Save</button>
        </div>
      </Sheet>

      <Sheet open={sheet==="reminder"} onClose={()=>setSheet(null)} title="Set reminder">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <input value={remLabel} onChange={e=>setRemLabel(e.target.value)} placeholder="Reminder message (optional)"/>
          <Lbl>Remind me in</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[1,3,5].map(h=>(
              <button key={h} onClick={()=>setRemHrs(h)} style={{padding:"17px 0",borderRadius:15,background:remHrs===h?dayAccent.grad:inp,border:`1.5px solid ${remHrs===h?dayAccent.a:border}`,color:remHrs===h?"#fff":tc,fontSize:18,fontWeight:700,transition:"all .18s",boxShadow:remHrs===h?`0 4px 14px ${dayAccent.a}44`:"none"}}>
                {h}<span style={{fontSize:13,fontWeight:500}}>h</span>
              </button>
            ))}
          </div>
          <button className="btn-a" onClick={startReminder}>Set reminder</button>
          {reminder.active&&<button onClick={cancelReminder} style={{color:"#ef4444",fontSize:14,fontWeight:600,padding:8,textAlign:"center"}}>Cancel reminder</button>}
        </div>
      </Sheet>

      <Sheet open={sheet==="expense"} onClose={()=>setSheet(null)} title={editExpId?"Edit expense":"Add expense"}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",fontWeight:700,fontSize:20,color:muted}}>₹</span>
            <input type="number" value={expForm.amount} onChange={e=>setExpForm(p=>({...p,amount:e.target.value}))} placeholder="0" autoFocus style={{paddingLeft:36,fontSize:28,fontWeight:700,letterSpacing:-.5}}/>
          </div>
          <div><Lbl>Description</Lbl><input value={expForm.desc} onChange={e=>setExpForm(p=>({...p,desc:e.target.value}))} placeholder="What did you spend on?"/></div>
          <div>
            <Lbl>Category</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {EXP_CATS.map(c=>(
                <button key={c.id} onClick={()=>setExpForm(p=>({...p,cat:c.id}))} style={{padding:"11px 4px",borderRadius:13,background:expForm.cat===c.id?c.color+"22":inp,border:`1.5px solid ${expForm.cat===c.id?c.color:border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s",boxShadow:expForm.cat===c.id?`0 0 10px ${c.color}44`:"none"}}>
                  <span style={{fontSize:21}}>{c.icon}</span>
                  <span style={{fontSize:10,fontWeight:600,color:expForm.cat===c.id?c.color:muted}}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div><Lbl>Date</Lbl><input type="date" value={expForm.date} onChange={e=>setExpForm(p=>({...p,date:e.target.value}))}/></div>
          <div style={{background:inp,borderRadius:14,padding:"14px 15px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><div style={{fontSize:15,fontWeight:500}}>Split expense</div><div style={{fontSize:12,color:muted}}>Splitwise / shared</div></div>
              <Toggle on={expForm.split} onChange={()=>setExpForm(p=>({...p,split:!p.split,splitWith:""}))}/>
            </div>
            {expForm.split&&(
              <div style={{marginTop:12}}>
                <input value={expForm.splitWith} onChange={e=>setExpForm(p=>({...p,splitWith:e.target.value}))} placeholder="Split with who?"/>
                {expForm.splitWith&&expForm.amount&&<div style={{marginTop:8,background:`${dayAccent.a}12`,borderRadius:10,padding:"10px 13px",fontSize:13,color:dayAccent.a,fontWeight:500}}>Each pays ₹{Math.round(+expForm.amount/2).toLocaleString()}</div>}
              </div>
            )}
          </div>
          <div><Lbl>Note (optional)</Lbl><input value={expForm.note} onChange={e=>setExpForm(p=>({...p,note:e.target.value}))} placeholder="Any details..."/></div>
          <button className="btn-a" onClick={saveExp}>{editExpId?"Save changes":"Save expense"}</button>
          {editExpId&&<button onClick={()=>deleteExp(editExpId)} style={{color:"#ef4444",fontSize:14,fontWeight:600,padding:8,textAlign:"center"}}>Delete expense</button>}
        </div>
      </Sheet>

      <Sheet open={sheet==="note"} onClose={()=>setSheet(null)} title={editNoteId?"Edit note":"New note"}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <input value={noteForm.title} onChange={e=>setNoteForm(p=>({...p,title:e.target.value}))} placeholder="Title (optional)" autoFocus/>
          <textarea value={noteForm.body} onChange={e=>setNoteForm(p=>({...p,body:e.target.value}))} placeholder="Start writing..." rows={8}/>
          <div><Lbl>Tags</Lbl><input value={noteForm.tags} onChange={e=>setNoteForm(p=>({...p,tags:e.target.value}))} placeholder="work, ideas, personal..."/></div>
          <div>
            <Lbl>Color</Lbl>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {NOTE_COLORS.map(c=>(
                <button key={c} onClick={()=>setNoteForm(p=>({...p,color:c}))} style={{width:33,height:33,borderRadius:"50%",background:c,border:`3px solid ${noteForm.color===c?"#fff":"transparent"}`,outline:`2px solid ${noteForm.color===c?c:"transparent"}`,transition:"all .16s",boxShadow:noteForm.color===c?`0 0 10px ${c}88`:"none"}}/>
              ))}
            </div>
          </div>
          <button className="btn-a" onClick={saveNote}>{editNoteId?"Update note":"Save note"}</button>
          {editNoteId&&<button onClick={()=>deleteNote(editNoteId)} style={{color:"#ef4444",fontSize:14,fontWeight:600,padding:8,textAlign:"center"}}>Delete note</button>}
        </div>
      </Sheet>
    </>
  );
}

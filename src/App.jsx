import { useState, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

/* ── constants ─────────────────────────────────────────────────────────────── */
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EXP_CATS = [
  { id:"food",      label:"Food",      icon:"🍽️", color:"#f97316" },
  { id:"transport", label:"Transport", icon:"🚗",  color:"#3b82f6" },
  { id:"shopping",  label:"Shopping",  icon:"🛍️", color:"#8b5cf6" },
  { id:"health",    label:"Health",    icon:"💊",  color:"#10b981" },
  { id:"bills",     label:"Bills",     icon:"🧾",  color:"#6366f1" },
  { id:"social",    label:"Social",    icon:"🎉",  color:"#ec4899" },
  { id:"edu",       label:"Education", icon:"📚",  color:"#f59e0b" },
  { id:"other",     label:"Other",     icon:"💳",  color:"#6b7280" },
];

const NOTE_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#ec4899","#06b6d4","#8b5cf6","#f97316"
];

const QUOTES = [
  ["Focus on progress, not perfection.","Unknown"],
  ["Small steps every day lead to big results.","Unknown"],
  ["Don't watch the clock; do what it does.","Sam Levenson"],
  ["The secret of getting ahead is getting started.","Mark Twain"],
  ["Your future is created by what you do today.","R. Kiyosaki"],
  ["Discipline is the bridge between goals and accomplishment.","Jim Rohn"],
  ["Today's actions are tomorrow's results.","Unknown"],
];

/* ── utils ─────────────────────────────────────────────────────────────────── */
function makeKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayKey() {
  return makeKey(new Date());
}
function offsetKey(k, n) {
  const [y,m,d] = k.split("-");
  const dt = new Date(+y, +m-1, +d);
  dt.setDate(dt.getDate() + n);
  return makeKey(dt);
}
function fmtKey(k) {
  const [y,m,d] = k.split("-");
  const dt = new Date(+y, +m-1, +d);
  return `${DAYS[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}
function fmtShort(k) {
  const [y,m,d] = k.split("-");
  const dt = new Date(+y, +m-1, +d);
  return `${DAYS[dt.getDay()].slice(0,3)} ${dt.getDate()}`;
}
function past7(fromKey) {
  const [y,m,d] = fromKey.split("-");
  return Array.from({ length:7 }, (_,i) => {
    const dt = new Date(+y, +m-1, +d);
    dt.setDate(dt.getDate() - 6 + i);
    return makeKey(dt);
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
function pctColor(p) {
  return p >= 80 ? "#10b981" : p >= 50 ? "#6366f1" : "#f59e0b";
}
const catOf    = id => EXP_CATS.find(c => c.id === id) || { color:"#888", icon:"💳", label:"Other" };
const catColor = id => catOf(id).color;
const catIcon  = id => catOf(id).icon;
const catLabel = id => catOf(id).label;

/* ── shared sub-components ─────────────────────────────────────────────────── */
function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:200,
        background:"rgba(0,0,0,0.55)",
        display:"flex", alignItems:"flex-end"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:"100%", background:"var(--card)",
          borderRadius:"22px 22px 0 0",
          maxHeight:"92vh", overflowY:"auto",
          animation:"slideUp .28s cubic-bezier(.4,0,.2,1)"
        }}
      >
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }}/>
        </div>
        {title && (
          <div style={{ padding:"6px 20px 12px", fontWeight:700, fontSize:17, color:"var(--text)" }}>
            {title}
          </div>
        )}
        <div style={{ padding:"0 20px 40px" }}>{children}</div>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, color="#6366f1" }) {
  return (
    <div
      onClick={onChange}
      style={{
        width:23, height:23, borderRadius:7, flexShrink:0, cursor:"pointer",
        border:`2px solid ${checked ? color : "var(--border)"}`,
        background: checked ? color : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .18s"
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

function Ring({ pct, size=72, stroke=7, color="#6366f1", children }) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size}
           style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke="var(--border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${(pct/100)*c} ${c}`}
                strokeLinecap="round"
                style={{ transition:"stroke-dasharray .5s ease" }}/>
      </svg>
      <div style={{
        position:"absolute", inset:0,
        display:"flex", alignItems:"center",
        justifyContent:"center", flexDirection:"column"
      }}>
        {children}
      </div>
    </div>
  );
}

function Lbl({ children }) {
  return (
    <div style={{
      fontSize:11, fontWeight:600, color:"var(--muted)",
      textTransform:"uppercase", letterSpacing:.6, marginBottom:6
    }}>
      {children}
    </div>
  );
}

function Sec({ children, action }) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between",
      alignItems:"center", marginBottom:10
    }}>
      <div style={{
        fontSize:12, fontWeight:600, color:"var(--muted)",
        textTransform:"uppercase", letterSpacing:.7
      }}>
        {children}
      </div>
      {action}
    </div>
  );
}

/* ── initial data ──────────────────────────────────────────────────────────── */
const TK = todayKey();

const INIT_TASKS = [
  { id:1, text:"Morning workout" },
  { id:2, text:"Read 30 minutes" },
  { id:3, text:"Check emails"    },
];

const EMPTY_DAY = () => ({ checks:{}, note:"", extra:[], special:[] });

const INIT_DAY = {
  [TK]: { checks:{ 1:true }, note:"", extra:[], special:[] }
};

const INIT_EXP = [
  { id:101, amount:180, desc:"Lunch at café",  cat:"food",      date:TK, note:"",        split:false, splitWith:"" },
  { id:102, amount:45,  desc:"Auto rickshaw",  cat:"transport", date:TK, note:"",        split:false, splitWith:"" },
  { id:103, amount:499, desc:"Netflix bill",   cat:"bills",     date:TK, note:"Monthly", split:true,  splitWith:"Raj" },
];

const INIT_NOTES = [
  {
    id:201,
    title:"Ideas for the week",
    body:"- Learn something new\n- Call family\n- Plan weekend",
    color:"#6366f1",
    pinned:true,
    created:TK,
    tags:["personal"]
  },
];

/* ── APP ───────────────────────────────────────────────────────────────────── */
export default function App() {
  const [dark,    setDark]    = useState(false);
  const [tab,     setTab]     = useState("today");
  const [viewKey, setViewKey] = useState(TK);

  /* data */
  const [tasks,    setTasks]    = useState(INIT_TASKS);
  const [dayData,  setDayData]  = useState(INIT_DAY);
  const [expenses, setExpenses] = useState(INIT_EXP);
  const [notes,    setNotes]    = useState(INIT_NOTES);

  /* sheets */
  const [sheet, setSheet] = useState(null);

  /* forms */
  const [taskForm,     setTaskForm]     = useState({ text:"" });
  const [expForm,      setExpForm]      = useState({ amount:"", desc:"", cat:"food", date:TK, note:"", split:false, splitWith:"" });
  const [noteForm,     setNoteForm]     = useState({ title:"", body:"", color:"#6366f1", tags:"" });
  const [editNote,     setEditNote]     = useState(null);
  const [priorityForm, setPriorityForm] = useState({ text:"", date:TK, reminder:false, reminderHrs:1 });
  const [remHrs,       setRemHrs]       = useState(1);
  const [remLabel,     setRemLabel]     = useState("");
  const [reminder,     setReminder]     = useState({ active:false, hrs:1, label:"" });
  const [noteSearch,   setNoteSearch]   = useState("");

  const remRef = useRef(null);

  const quote   = QUOTES[new Date().getDay() % QUOTES.length];
  const tk      = todayKey();
  const isToday = viewKey === tk;

  /* ── day helpers ─────────────────────────────────────────────────────────── */
  const getDay   = k => dayData[k] || EMPTY_DAY();
  const patchDay = (k, patch) =>
    setDayData(p => ({ ...p, [k]: { ...(p[k] || EMPTY_DAY()), ...patch } }));

  const curDay   = getDay(viewKey);
  const reg      = tasks;

  function calcPct(k) {
    const d     = getDay(k);
    const extra   = d.extra   || [];
    const special = d.special || [];
    const total = reg.length + extra.length + special.length;
    if (!total) return 0;
    const done = reg.filter(t => d.checks?.[t.id]).length
               + extra.filter(x => x.done).length
               + special.filter(x => x.done).length;
    return Math.round((done / total) * 100);
  }

  const viewPct   = calcPct(viewKey);
  const totalView = reg.length + (curDay.extra||[]).length + (curDay.special||[]).length;
  const doneView  = reg.filter(t => curDay.checks?.[t.id]).length
                  + (curDay.extra||[]).filter(x => x.done).length
                  + (curDay.special||[]).filter(x => x.done).length;

  /* ── expense helpers ─────────────────────────────────────────────────────── */
  function addExp() {
    if (!expForm.amount || !expForm.desc.trim()) return;
    setExpenses(p => [{ ...expForm, id:Date.now(), amount:+expForm.amount }, ...p]);
    setExpForm({ amount:"", desc:"", cat:"food", date:todayKey(), note:"", split:false, splitWith:"" });
    setSheet(null);
  }

  const monthPfx   = currMonthPrefix();
  const monthExp   = expenses.filter(e => e.date.startsWith(monthPfx));
  const totalMonth = monthExp.reduce((s,e) => s + e.amount, 0);
  const todayExp   = expenses.filter(e => e.date === tk).reduce((s,e) => s + e.amount, 0);
  const expByCat   = EXP_CATS
    .map(c => ({ ...c, total: monthExp.filter(e => e.cat===c.id).reduce((s,e) => s+e.amount, 0) }))
    .filter(x => x.total > 0)
    .sort((a,b) => b.total - a.total);
  const splitExp   = expenses.filter(e => e.split);
  const days7      = past7(viewKey);
  const expTrend   = days7.map(k => ({ label:fmtShort(k), amt:expenses.filter(e=>e.date===k).reduce((s,e)=>s+e.amount,0) }));
  const taskTrend  = days7.map(k => ({ label:fmtShort(k), pct:calcPct(k) }));

  /* ── reminder ────────────────────────────────────────────────────────────── */
  function startReminder() {
    if (remRef.current) clearTimeout(remRef.current);
    remRef.current = setTimeout(() => {
      alert(`⏰ ${remLabel || "Check your tasks!"}`);
      setReminder(r => ({ ...r, active:false }));
    }, remHrs * 3600 * 1000);
    setReminder({ active:true, hrs:remHrs, label:remLabel });
    setSheet(null);
  }

  function cancelReminder() {
    if (remRef.current) clearTimeout(remRef.current);
    setReminder({ active:false, hrs:1, label:"" });
  }

  function taskReminder(text, hrs) {
    setTimeout(() => alert(`⏰ Reminder: "${text}"`), hrs * 3600 * 1000);
  }

  /* ── notes helpers ───────────────────────────────────────────────────────── */
  function saveNote() {
    if (!noteForm.body.trim()) return;
    const tagArr = noteForm.tags.split(",").map(t => t.trim()).filter(Boolean);
    if (editNote) {
      setNotes(p => p.map(n => n.id === editNote ? { ...n, ...noteForm, tags:tagArr } : n));
      setEditNote(null);
    } else {
      setNotes(p => [{
        id:Date.now(), title:noteForm.title, body:noteForm.body,
        color:noteForm.color, pinned:false, created:todayKey(), tags:tagArr
      }, ...p]);
    }
    setNoteForm({ title:"", body:"", color:"#6366f1", tags:"" });
    setSheet(null);
  }

  function openEditNote(n) {
    setNoteForm({ title:n.title, body:n.body, color:n.color, tags:(n.tags||[]).join(", ") });
    setEditNote(n.id);
    setSheet("editNote");
  }

  const filteredNotes = notes
    .filter(n => !noteSearch
      || n.title.toLowerCase().includes(noteSearch.toLowerCase())
      || n.body.toLowerCase().includes(noteSearch.toLowerCase())
      || (n.tags||[]).some(t => t.toLowerCase().includes(noteSearch.toLowerCase()))
    )
    .sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  /* ── theme tokens ────────────────────────────────────────────────────────── */
  const bg     = dark ? "#0d0d0f" : "#f2f2f7";
  const card   = dark ? "#1c1c1e" : "#ffffff";
  const text   = dark ? "#f2f2f7" : "#1c1c1e";
  const muted  = "#8e8e93";
  const border = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const inp    = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    :root{
      --bg:${bg};--card:${card};--text:${text};
      --muted:${muted};--border:${border};--inp:${inp};--accent:#6366f1
    }
    html,body{
      background:var(--bg);color:var(--text);
      font-family:'DM Sans',system-ui,sans-serif;
      font-size:15px;line-height:1.5;
      max-width:430px;margin:0 auto;min-height:100vh
    }
    input,select,textarea{
      background:var(--inp);border:1.5px solid var(--border);
      border-radius:12px;color:var(--text);padding:12px 14px;
      font-size:15px;width:100%;outline:none;font-family:inherit;
      transition:border-color .15s;-webkit-appearance:none;appearance:none
    }
    input:focus,select:focus,textarea:focus{border-color:var(--accent)}
    textarea{resize:vertical}
    button{cursor:pointer;font-family:inherit;border:none;outline:none;background:none}
    .card{background:var(--card);border-radius:18px;padding:16px}
    .btn-p{
      background:var(--accent);color:#fff;border-radius:14px;
      padding:14px;font-size:15px;font-weight:600;
      width:100%;display:block;transition:opacity .15s
    }
    .btn-p:active{opacity:.82}
    .dash{
      background:var(--card);border:1.5px dashed var(--border);
      border-radius:14px;padding:13px;font-size:13px;font-weight:600;
      color:var(--muted);display:flex;align-items:center;
      justify-content:center;gap:6px;width:100%
    }
    ::-webkit-scrollbar{display:none}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .fade{animation:fadeIn .3s ease}
    .toggle{width:44px;height:26px;border-radius:13px;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
    .toggle-knob{position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
  `;

  /* ── inner components (defined BEFORE return) ───────────────────────────── */

  function Toggle({ on, onChange }) {
    return (
      <div className="toggle" style={{ background: on ? "#6366f1" : border }} onClick={onChange}>
        <div className="toggle-knob" style={{ left: on ? 21 : 3 }}/>
      </div>
    );
  }

  function DayNav() {
    const isFuture = viewKey > tk;
    return (
      <div style={{
        display:"flex", alignItems:"center",
        background:card, borderRadius:14,
        border:`1px solid ${border}`, overflow:"hidden", marginBottom:14
      }}>
        <button
          onClick={() => setViewKey(k => offsetKey(k, -1))}
          style={{ padding:"10px 16px", color:muted, fontSize:20, lineHeight:1 }}>
          ‹
        </button>
        <div style={{ flex:1, textAlign:"center", padding:"8px 0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:text }}>
            {isToday ? "Today" : fmtKey(viewKey)}
          </div>
          {!isToday && (
            <div style={{ fontSize:11, color:muted, marginTop:1 }}>{fmtKey(viewKey)}</div>
          )}
        </div>
        <button
          onClick={() => setViewKey(k => offsetKey(k, 1))}
          disabled={isFuture}
          style={{ padding:"10px 16px", color: isFuture ? border : muted, fontSize:20, lineHeight:1 }}>
          ›
        </button>
        {!isToday && (
          <button
            onClick={() => setViewKey(tk)}
            style={{
              padding:"10px 14px", fontSize:11, fontWeight:600,
              color:"#6366f1", borderLeft:`1px solid ${border}`
            }}>
            Today
          </button>
        )}
      </div>
    );
  }

  function NoteCard({ n }) {
    return (
      <div
        onClick={() => openEditNote(n)}
        style={{
          background: n.color + "15",
          border:`1.5px solid ${n.color}30`,
          borderRadius:16, padding:"14px",
          cursor:"pointer", position:"relative", minHeight:100
        }}
      >
        <div style={{ position:"absolute", top:10, right:10 }}>
          <button
            onClick={e => {
              e.stopPropagation();
              setNotes(p => p.map(x => x.id===n.id ? { ...x, pinned:!x.pinned } : x));
            }}
            style={{ fontSize:14, opacity: n.pinned ? 1 : .3, transition:"opacity .2s" }}>
            📌
          </button>
        </div>
        <div style={{ width:10, height:10, borderRadius:"50%", background:n.color, marginBottom:8 }}/>
        {n.title && (
          <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:5, paddingRight:24, lineHeight:1.3 }}>
            {n.title}
          </div>
        )}
        <div style={{
          fontSize:13, color:muted, lineHeight:1.55,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:4, WebkitBoxOrient:"vertical"
        }}>
          {n.body}
        </div>
        {(n.tags||[]).length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:10 }}>
            {n.tags.map(t => (
              <span key={t} style={{
                fontSize:10, fontWeight:600, padding:"2px 6px",
                borderRadius:99, background:n.color+"25", color:n.color
              }}>
                #{t}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize:10, color:muted, marginTop:8 }}>{fmtKey(n.created)}</div>
      </div>
    );
  }

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{css}</style>
      <div style={{ paddingBottom:90 }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          padding:"52px 20px 0", display:"flex",
          alignItems:"flex-start", justifyContent:"space-between"
        }}>
          <div>
            <div style={{ fontSize:13, color:muted, fontWeight:500 }}>{fmtKey(tk)}</div>
            <div style={{ fontSize:24, fontWeight:700, marginTop:2, letterSpacing:-.5 }}>
              {getGreeting()} 👋
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            {reminder.active && (
              <div style={{
                background:"#6366f115", border:"1px solid #6366f140",
                borderRadius:12, padding:"6px 10px",
                fontSize:13, fontWeight:600, color:"#6366f1",
                display:"flex", alignItems:"center", gap:4
              }}>
                ⏰ {reminder.hrs}hr
                <button onClick={cancelReminder} style={{ color:muted, fontSize:16, paddingLeft:2 }}>×</button>
              </div>
            )}
            <button
              onClick={() => setDark(d => !d)}
              style={{
                background:card, border:`1px solid ${border}`,
                borderRadius:12, width:36, height:36, fontSize:16,
                display:"flex", alignItems:"center", justifyContent:"center"
              }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* ── Quote ──────────────────────────────────────────────────── */}
        <div style={{ padding:"12px 20px 0" }}>
          <div style={{
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            borderRadius:16, padding:"11px 16px"
          }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.92)", fontStyle:"italic", lineHeight:1.55 }}>
              "{quote[0]}"
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:3 }}>
              — {quote[1]}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div style={{ padding:"12px 20px 0", display:"flex", gap:6 }}>
          {[["today","Today"],["stats","Stats"],["expenses","Wallet"],["notes","Notes"]].map(([id,label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex:1, padding:"9px 4px", borderRadius:12,
                fontSize:13, fontWeight:600,
                background: tab===id ? "#6366f1" : card,
                color:      tab===id ? "#fff"    : muted,
                border:`1px solid ${tab===id ? "transparent" : border}`,
                transition:"all .2s"
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Page body ──────────────────────────────────────────────── */}
        <div style={{ padding:"12px 20px 0" }} className="fade" key={tab}>

          {/* ════════════════ TODAY ══════════════════════════════════ */}
          {tab === "today" && (
            <>
              <DayNav/>

              {/* Progress card */}
              <div className="card" style={{ display:"flex", gap:16, alignItems:"center", marginBottom:12 }}>
                <Ring pct={viewPct} size={72} stroke={7} color={pctColor(viewPct)}>
                  <span style={{ fontSize:15, fontWeight:700, color:pctColor(viewPct) }}>{viewPct}%</span>
                </Ring>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:700 }}>{doneView}/{totalView} done</div>
                  <div style={{ fontSize:13, color:muted, marginTop:2 }}>
                    {viewPct === 100 ? "All done! 🎉"
                      : viewPct >= 50 ? "Halfway there 💪"
                      : "Let's get started 🚀"}
                  </div>
                  <div style={{ marginTop:10, height:5, background:border, borderRadius:99, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", width:`${viewPct}%`,
                      background:pctColor(viewPct), borderRadius:99,
                      transition:"width .5s ease"
                    }}/>
                  </div>
                </div>
              </div>

              {/* Daily tasks */}
              <div className="card" style={{ marginBottom:12 }}>
                <Sec action={
                  <button
                    onClick={() => { setTaskForm({ text:"" }); setSheet("addTask"); }}
                    style={{
                      background:"#6366f1", color:"#fff",
                      borderRadius:10, padding:"5px 13px",
                      fontSize:12, fontWeight:600
                    }}>
                    + Add
                  </button>
                }>Daily tasks</Sec>

                {reg.length === 0 && (
                  <div style={{ textAlign:"center", padding:"16px 0", color:muted, fontSize:14 }}>
                    No tasks yet — add your first!
                  </div>
                )}
                {reg.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display:"flex", alignItems:"center", gap:12, padding:"11px 0",
                      borderBottom: i < reg.length-1 ? `1px solid ${border}` : "none"
                    }}
                  >
                    <Checkbox
                      checked={!!curDay.checks?.[t.id]}
                      onChange={() => patchDay(viewKey, { checks:{ ...curDay.checks, [t.id]:!curDay.checks?.[t.id] } })}
                    />
                    <span style={{
                      flex:1, fontSize:15,
                      textDecoration: curDay.checks?.[t.id] ? "line-through" : "none",
                      color: curDay.checks?.[t.id] ? muted : text,
                      transition:"all .2s"
                    }}>
                      {t.text}
                    </span>
                    <button
                      onClick={() => setTasks(p => p.filter(x => x.id !== t.id))}
                      style={{ color:muted, fontSize:19, lineHeight:1, padding:"0 2px" }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Extra tasks — only when present */}
              {(curDay.extra||[]).length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <Sec>Extra tasks</Sec>
                  {(curDay.extra||[]).map((t, i) => (
                    <div
                      key={i}
                      style={{
                        display:"flex", alignItems:"center", gap:12, padding:"11px 0",
                        borderBottom: i < curDay.extra.length-1 ? `1px solid ${border}` : "none"
                      }}
                    >
                      <Checkbox
                        checked={t.done}
                        color="#06b6d4"
                        onChange={() => {
                          const a = [...curDay.extra];
                          a[i] = { ...a[i], done:!a[i].done };
                          patchDay(viewKey, { extra:a });
                        }}
                      />
                      <span style={{
                        flex:1, fontSize:15,
                        textDecoration: t.done ? "line-through" : "none",
                        color: t.done ? muted : text
                      }}>
                        {t.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Priority tasks — only when present */}
              {(curDay.special||[]).length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <Sec>⭐ Priority tasks</Sec>
                  {(curDay.special||[]).map((t, i) => (
                    <div
                      key={i}
                      style={{
                        display:"flex", alignItems:"center", gap:12, padding:"11px 0",
                        borderBottom: i < curDay.special.length-1 ? `1px solid ${border}` : "none"
                      }}
                    >
                      <Checkbox
                        checked={t.done}
                        color="#ef4444"
                        onChange={() => {
                          const a = [...curDay.special];
                          a[i] = { ...a[i], done:!a[i].done };
                          patchDay(viewKey, { special:a });
                        }}
                      />
                      <div style={{ flex:1 }}>
                        <span style={{
                          fontSize:15,
                          textDecoration: t.done ? "line-through" : "none",
                          color: t.done ? muted : text
                        }}>
                          {t.text}
                        </span>
                        {t.dueDate && t.dueDate !== viewKey && (
                          <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>
                            Due {fmtKey(t.dueDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <button
                  className="dash"
                  onClick={() => { setTaskForm({ text:"" }); setSheet("addExtra"); }}>
                  + Extra task
                </button>
                <button
                  onClick={() => setSheet("addPriority")}
                  style={{
                    background:card, border:"1.5px dashed #ef444440",
                    borderRadius:14, padding:"13px", fontSize:13, fontWeight:600,
                    color:"#ef4444", display:"flex", alignItems:"center",
                    justifyContent:"center", gap:6
                  }}>
                  ⭐ Priority task
                </button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button className="dash" onClick={() => setSheet("dayNote")}>
                  📝 {curDay.note ? "Edit note" : "Day note"}
                </button>
                <button
                  onClick={() => setSheet("reminder")}
                  style={{
                    background: reminder.active ? "#6366f110" : card,
                    border:`1px solid ${reminder.active ? "#6366f1" : border}`,
                    borderRadius:14, padding:"13px", fontSize:13, fontWeight:600,
                    color: reminder.active ? "#6366f1" : muted,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6
                  }}>
                  ⏰ {reminder.active ? `${reminder.hrs}hr set` : "Reminder"}
                </button>
              </div>

              {curDay.note && (
                <div className="card" style={{ marginTop:10, borderLeft:"3px solid #6366f1" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:4 }}>DAY NOTE</div>
                  <div style={{ fontSize:14, color:text, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                    {curDay.note}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════ STATS ══════════════════════════════════ */}
          {tab === "stats" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                {[
                  { label:"7-day avg",  val:Math.round(taskTrend.reduce((s,d)=>s+d.pct,0)/7)+"%", sub:"completion",  color:"#6366f1" },
                  { label:"Best day",   val:taskTrend.reduce((a,c)=>c.pct>a.pct?c:a, taskTrend[0]).pct+"%",           sub:"peak",       color:"#10b981" },
                  { label:"Today",      val:"₹"+todayExp.toLocaleString(),                          sub:"spent today", color:"#f97316" },
                  { label:"This month", val:"₹"+totalMonth.toLocaleString(),                        sub:"total",       color:"#ef4444" },
                ].map(s => (
                  <div key={s.label} className="card">
                    <div style={{ fontSize:11, color:muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.6, marginBottom:6 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:12, color:muted, marginTop:2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom:12 }}>
                <Sec>7-day completion</Sec>
                <ResponsiveContainer width="100%" height={155}>
                  <AreaChart data={taskTrend} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                    <XAxis dataKey="label" tick={{ fontSize:10, fill:muted }} tickLine={false} axisLine={false}/>
                    <YAxis domain={[0,100]} tick={{ fontSize:10, fill:muted }} tickLine={false} axisLine={false}/>
                    <Tooltip
                      contentStyle={{ background:card, border:`1px solid ${border}`, borderRadius:10, fontSize:12, color:text }}
                      formatter={v => [v+"%","Done"]}/>
                    <Area type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2} fill="url(#g1)" dot={{ fill:"#6366f1", r:3 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <Sec>Daily log</Sec>
                {days7.slice().reverse().map(k => {
                  const p  = calcPct(k);
                  const nd = getDay(k);
                  return (
                    <div
                      key={k}
                      onClick={() => { setViewKey(k); setTab("today"); }}
                      style={{
                        display:"flex", alignItems:"center", gap:12, padding:"10px 0",
                        borderBottom:`1px solid ${border}`, cursor:"pointer"
                      }}
                    >
                      <Ring pct={p} size={42} stroke={4} color={pctColor(p)}>
                        <span style={{ fontSize:9, fontWeight:700, color:pctColor(p) }}>{p}%</span>
                      </Ring>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600 }}>
                          {fmtKey(k)}{k === tk ? " · Today" : ""}
                        </div>
                        <div style={{ fontSize:12, color:muted, marginTop:1 }}>
                          {nd.note ? "Has note · " : ""}
                          {reg.filter(t => nd.checks?.[t.id]).length}/{reg.length} regular done
                        </div>
                      </div>
                      <div style={{ fontSize:13, color:muted }}>›</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ════════════════ WALLET ═════════════════════════════════ */}
          {tab === "expenses" && (
            <>
              {/* Month hero card */}
              <div style={{
                background:"linear-gradient(135deg,#1e1b4b,#312e81)",
                borderRadius:20, padding:"20px", marginBottom:12
              }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>This month</div>
                <div style={{ fontSize:36, fontWeight:700, color:"#fff", letterSpacing:-1.5, margin:"6px 0 4px" }}>
                  ₹{totalMonth.toLocaleString()}
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>{monthExp.length} transactions</div>
                <div style={{ display:"flex", gap:20, marginTop:16 }}>
                  {[
                    { label:"Today",     val:"₹"+todayExp.toLocaleString() },
                    { label:"Avg/day",   val:"₹"+(monthExp.length ? Math.round(totalMonth/new Date().getDate()) : 0).toLocaleString() },
                    { label:"Splitwise", val:splitExp.length+" items" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{s.label}</div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#fff", marginTop:2 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="dash"
                onClick={() => setSheet("addExp")}
                style={{ marginBottom:12, color:"#6366f1", borderColor:"#6366f130" }}>
                + Add expense
              </button>

              {/* Split summary */}
              {splitExp.length > 0 && (
                <div className="card" style={{ marginBottom:12, border:`1px solid #6366f130` }}>
                  <Sec>🤝 Split expenses</Sec>
                  {splitExp.map((e, i) => (
                    <div
                      key={e.id}
                      style={{
                        display:"flex", alignItems:"center", gap:10, padding:"8px 0",
                        borderBottom: i < splitExp.length-1 ? `1px solid ${border}` : "none"
                      }}
                    >
                      <div style={{
                        width:36, height:36, borderRadius:10, flexShrink:0,
                        background:catColor(e.cat)+"18",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:18
                      }}>
                        {catIcon(e.cat)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{e.desc}</div>
                        <div style={{ fontSize:11, color:muted }}>Split with {e.splitWith}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#6366f1" }}>
                          ₹{(e.amount/2).toLocaleString()}
                        </div>
                        <div style={{ fontSize:10, color:muted }}>your share</div>
                      </div>
                    </div>
                  ))}
                  <div style={{
                    marginTop:10, paddingTop:10, borderTop:`1px solid ${border}`,
                    display:"flex", justifyContent:"space-between", alignItems:"center"
                  }}>
                    <span style={{ fontSize:13, color:muted }}>Total split amount</span>
                    <span style={{ fontSize:15, fontWeight:700, color:"#6366f1" }}>
                      ₹{(splitExp.reduce((s,e)=>s+e.amount,0)/2).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Spending chart */}
              {expTrend.some(d => d.amt > 0) && (
                <div className="card" style={{ marginBottom:12 }}>
                  <Sec>Spending — 7 days</Sec>
                  <ResponsiveContainer width="100%" height={135}>
                    <BarChart data={expTrend} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                      <XAxis dataKey="label" tick={{ fontSize:10, fill:muted }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:muted }} tickLine={false} axisLine={false}/>
                      <Tooltip
                        contentStyle={{ background:card, border:`1px solid ${border}`, borderRadius:10, fontSize:12, color:text }}
                        formatter={v => ["₹"+v,"Spent"]}/>
                      <Bar dataKey="amt" fill="#6366f1" radius={[5,5,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Category breakdown */}
              {expByCat.length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <Sec>By category</Sec>
                  {expByCat.map(c => (
                    <div key={c.id} style={{ marginBottom:11 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:14 }}>
                        <span>{c.icon} {c.label}</span>
                        <span style={{ fontWeight:600 }}>₹{c.total.toLocaleString()}</span>
                      </div>
                      <div style={{ height:5, background:border, borderRadius:99, overflow:"hidden" }}>
                        <div style={{
                          height:"100%",
                          width:`${Math.round((c.total/totalMonth)*100)}%`,
                          background:c.color, borderRadius:99,
                          transition:"width .4s ease"
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions list */}
              <div className="card">
                <Sec>Transactions</Sec>
                {expenses.length === 0 && (
                  <div style={{ textAlign:"center", padding:"20px 0", color:muted, fontSize:14 }}>
                    <div style={{ fontSize:30, marginBottom:8 }}>💸</div>
                    No expenses yet
                  </div>
                )}
                {expenses.slice(0,40).map((e, i) => (
                  <div
                    key={e.id}
                    style={{
                      display:"flex", alignItems:"center", gap:12, padding:"11px 0",
                      borderBottom: i < Math.min(expenses.length,40)-1 ? `1px solid ${border}` : "none"
                    }}
                  >
                    <div style={{
                      width:44, height:44, borderRadius:12, flexShrink:0,
                      background:catColor(e.cat)+"18",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:21
                    }}>
                      {catIcon(e.cat)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {e.desc}
                      </div>
                      <div style={{ fontSize:12, color:muted, marginTop:1, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                        <span>{catLabel(e.cat)} · {fmtKey(e.date)}</span>
                        {e.split && (
                          <span style={{
                            background:"#6366f118", color:"#6366f1",
                            borderRadius:6, padding:"0 5px",
                            fontSize:10, fontWeight:600
                          }}>
                            Split w/ {e.splitWith}
                          </span>
                        )}
                      </div>
                      {e.note && (
                        <div style={{ fontSize:11, color:muted, marginTop:1, fontStyle:"italic" }}>{e.note}</div>
                      )}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#ef4444" }}>
                        ₹{e.amount.toLocaleString()}
                      </div>
                      {e.split && (
                        <div style={{ fontSize:10, color:"#6366f1" }}>₹{(e.amount/2).toLocaleString()} each</div>
                      )}
                      <button
                        onClick={() => setExpenses(p => p.filter(x => x.id !== e.id))}
                        style={{ fontSize:11, color:muted, marginTop:2 }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ════════════════ NOTES ══════════════════════════════════ */}
          {tab === "notes" && (
            <>
              {/* Search + add */}
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, color:muted }}>
                    🔍
                  </span>
                  <input
                    value={noteSearch}
                    onChange={e => setNoteSearch(e.target.value)}
                    placeholder="Search notes, tags..."
                    style={{ paddingLeft:36 }}
                  />
                </div>
                <button
                  onClick={() => { setNoteForm({ title:"", body:"", color:"#6366f1", tags:"" }); setEditNote(null); setSheet("editNote"); }}
                  style={{
                    background:"#6366f1", color:"#fff", borderRadius:12,
                    padding:"0 18px", fontSize:20, fontWeight:600, flexShrink:0
                  }}>
                  +
                </button>
              </div>

              {filteredNotes.length === 0 && (
                <div style={{ textAlign:"center", padding:"48px 0", color:muted }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>📝</div>
                  <div style={{ fontSize:15, fontWeight:600 }}>
                    {noteSearch ? "No results" : "No notes yet"}
                  </div>
                  <div style={{ fontSize:13, marginTop:4 }}>
                    {noteSearch ? "Try a different search" : "Tap + to write your first note"}
                  </div>
                </div>
              )}

              {/* Pinned */}
              {filteredNotes.filter(n => n.pinned).length > 0 && (
                <>
                  <div style={{ fontSize:11, fontWeight:600, color:muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>
                    📌 Pinned
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                    {filteredNotes.filter(n => n.pinned).map(n => <NoteCard key={n.id} n={n}/>)}
                  </div>
                </>
              )}

              {/* All others */}
              {filteredNotes.filter(n => !n.pinned).length > 0 && (
                <>
                  {filteredNotes.filter(n => n.pinned).length > 0 && (
                    <div style={{ fontSize:11, fontWeight:600, color:muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>
                      All notes
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {filteredNotes.filter(n => !n.pinned).map(n => <NoteCard key={n.id} n={n}/>)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════════════ BOTTOM SHEETS ══════════════════════════════ */}

      {/* Add regular task */}
      <Sheet open={sheet==="addTask"} onClose={() => setSheet(null)} title="Add daily task">
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            value={taskForm.text}
            onChange={e => setTaskForm(p => ({ ...p, text:e.target.value }))}
            placeholder="What do you need to do every day?"
            autoFocus
          />
          <button
            className="btn-p"
            onClick={() => {
              if (!taskForm.text.trim()) return;
              setTasks(p => [...p, { id:Date.now(), text:taskForm.text.trim() }]);
              setTaskForm({ text:"" });
              setSheet(null);
            }}>
            Add task
          </button>
        </div>
      </Sheet>

      {/* Add extra task */}
      <Sheet open={sheet==="addExtra"} onClose={() => setSheet(null)} title="Extra task for today">
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            value={taskForm.text}
            onChange={e => setTaskForm(p => ({ ...p, text:e.target.value }))}
            placeholder="What extra task for this day?"
            autoFocus
          />
          <button
            className="btn-p"
            onClick={() => {
              if (!taskForm.text.trim()) return;
              patchDay(viewKey, { extra:[...(curDay.extra||[]), { text:taskForm.text.trim(), done:false }] });
              setTaskForm({ text:"" });
              setSheet(null);
            }}>
            Add
          </button>
        </div>
      </Sheet>

      {/* Add priority task */}
      <Sheet open={sheet==="addPriority"} onClose={() => setSheet(null)} title="⭐ Priority task">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <Lbl>Task</Lbl>
            <input
              value={priorityForm.text}
              onChange={e => setPriorityForm(p => ({ ...p, text:e.target.value }))}
              placeholder="What's the priority?"
              autoFocus
            />
          </div>
          <div>
            <Lbl>Due date</Lbl>
            <input
              type="date"
              value={priorityForm.date}
              onChange={e => setPriorityForm(p => ({ ...p, date:e.target.value }))}
            />
          </div>
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:inp, borderRadius:12, padding:"12px 14px"
          }}>
            <div>
              <div style={{ fontSize:15, fontWeight:500 }}>Set reminder</div>
              <div style={{ fontSize:12, color:muted }}>Get notified before due time</div>
            </div>
            <Toggle
              on={priorityForm.reminder}
              onChange={() => setPriorityForm(p => ({ ...p, reminder:!p.reminder }))}
            />
          </div>
          {priorityForm.reminder && (
            <div>
              <Lbl>Remind me in</Lbl>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[1,3,5].map(h => (
                  <button
                    key={h}
                    onClick={() => setPriorityForm(p => ({ ...p, reminderHrs:h }))}
                    style={{
                      padding:"12px 0", borderRadius:12,
                      background: priorityForm.reminderHrs===h ? "#ef4444" : inp,
                      border:`1.5px solid ${priorityForm.reminderHrs===h ? "#ef4444" : border}`,
                      color: priorityForm.reminderHrs===h ? "#fff" : text,
                      fontSize:16, fontWeight:700, transition:"all .15s"
                    }}>
                    {h}<span style={{ fontSize:12, fontWeight:500 }}>h</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            className="btn-p"
            style={{ background:"#ef4444" }}
            onClick={() => {
              if (!priorityForm.text.trim()) return;
              const task = { text:priorityForm.text.trim(), done:false, dueDate:priorityForm.date };
              patchDay(priorityForm.date, {
                special:[...(getDay(priorityForm.date).special||[]), task]
              });
              if (priorityForm.reminder) taskReminder(priorityForm.text.trim(), priorityForm.reminderHrs);
              setPriorityForm({ text:"", date:tk, reminder:false, reminderHrs:1 });
              setSheet(null);
            }}>
            Add priority task
          </button>
        </div>
      </Sheet>

      {/* Day note */}
      <Sheet open={sheet==="dayNote"} onClose={() => setSheet(null)} title="Day note">
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <textarea
            value={curDay.note || ""}
            onChange={e => patchDay(viewKey, { note:e.target.value })}
            placeholder="How was your day? Thoughts, reflections, anything..."
            rows={7}
            autoFocus
          />
          <button className="btn-p" onClick={() => setSheet(null)}>Save</button>
        </div>
      </Sheet>

      {/* Reminder */}
      <Sheet open={sheet==="reminder"} onClose={() => setSheet(null)} title="Set reminder">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input
            value={remLabel}
            onChange={e => setRemLabel(e.target.value)}
            placeholder="Reminder message (optional)"
          />
          <Lbl>Remind me in</Lbl>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[1,3,5].map(h => (
              <button
                key={h}
                onClick={() => setRemHrs(h)}
                style={{
                  padding:"16px 0", borderRadius:14,
                  background: remHrs===h ? "#6366f1" : inp,
                  border:`1.5px solid ${remHrs===h ? "#6366f1" : border}`,
                  color: remHrs===h ? "#fff" : text,
                  fontSize:18, fontWeight:700, transition:"all .15s"
                }}>
                {h}<span style={{ fontSize:13, fontWeight:500 }}>h</span>
              </button>
            ))}
          </div>
          <button className="btn-p" onClick={startReminder}>Set reminder</button>
          {reminder.active && (
            <button
              onClick={cancelReminder}
              style={{ color:"#ef4444", fontSize:14, fontWeight:600, padding:8 }}>
              Cancel reminder
            </button>
          )}
        </div>
      </Sheet>

      {/* Add expense */}
      <Sheet open={sheet==="addExp"} onClose={() => setSheet(null)} title="Add expense">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ position:"relative" }}>
            <span style={{
              position:"absolute", left:14, top:"50%",
              transform:"translateY(-50%)",
              fontWeight:700, fontSize:20, color:muted
            }}>₹</span>
            <input
              type="number"
              value={expForm.amount}
              onChange={e => setExpForm(p => ({ ...p, amount:e.target.value }))}
              placeholder="0"
              autoFocus
              style={{ paddingLeft:34, fontSize:26, fontWeight:700, letterSpacing:-.5 }}
            />
          </div>

          <div>
            <Lbl>Description</Lbl>
            <input
              value={expForm.desc}
              onChange={e => setExpForm(p => ({ ...p, desc:e.target.value }))}
              placeholder="What did you spend on?"
            />
          </div>

          <div>
            <Lbl>Category</Lbl>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {EXP_CATS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setExpForm(p => ({ ...p, cat:c.id }))}
                  style={{
                    padding:"10px 4px", borderRadius:12,
                    background: expForm.cat===c.id ? c.color+"22" : inp,
                    border:`1.5px solid ${expForm.cat===c.id ? c.color : border}`,
                    display:"flex", flexDirection:"column",
                    alignItems:"center", gap:3, transition:"all .15s"
                  }}>
                  <span style={{ fontSize:20 }}>{c.icon}</span>
                  <span style={{ fontSize:10, fontWeight:600, color: expForm.cat===c.id ? c.color : muted }}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Date</Lbl>
            <input
              type="date"
              value={expForm.date}
              onChange={e => setExpForm(p => ({ ...p, date:e.target.value }))}
            />
          </div>

          {/* Splitwise toggle */}
          <div style={{ background:inp, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:500 }}>Split expense</div>
                <div style={{ fontSize:12, color:muted }}>Splitwise / shared cost</div>
              </div>
              <Toggle
                on={expForm.split}
                onChange={() => setExpForm(p => ({ ...p, split:!p.split, splitWith:"" }))}
              />
            </div>
            {expForm.split && (
              <div style={{ marginTop:12 }}>
                <input
                  value={expForm.splitWith}
                  onChange={e => setExpForm(p => ({ ...p, splitWith:e.target.value }))}
                  placeholder="Split with who? (name)"
                />
                {expForm.splitWith && expForm.amount && (
                  <div style={{
                    marginTop:8, background:"#6366f110", borderRadius:8,
                    padding:"8px 12px", fontSize:13, color:"#6366f1", fontWeight:500
                  }}>
                    Each pays ₹{Math.round(+expForm.amount / 2).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Lbl>Note (optional)</Lbl>
            <input
              value={expForm.note}
              onChange={e => setExpForm(p => ({ ...p, note:e.target.value }))}
              placeholder="Any details..."
            />
          </div>

          <button className="btn-p" onClick={addExp}>Save expense</button>
        </div>
      </Sheet>

      {/* Note editor */}
      <Sheet
        open={sheet==="editNote"}
        onClose={() => setSheet(null)}
        title={editNote ? "Edit note" : "New note"}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input
            value={noteForm.title}
            onChange={e => setNoteForm(p => ({ ...p, title:e.target.value }))}
            placeholder="Title (optional)"
            autoFocus
          />
          <textarea
            value={noteForm.body}
            onChange={e => setNoteForm(p => ({ ...p, body:e.target.value }))}
            placeholder="Start writing..."
            rows={8}
          />
          <div>
            <Lbl>Tags</Lbl>
            <input
              value={noteForm.tags}
              onChange={e => setNoteForm(p => ({ ...p, tags:e.target.value }))}
              placeholder="work, ideas, personal (comma separated)"
            />
          </div>
          <div>
            <Lbl>Color</Lbl>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {NOTE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNoteForm(p => ({ ...p, color:c }))}
                  style={{
                    width:32, height:32, borderRadius:"50%", background:c,
                    border:`3px solid ${noteForm.color===c ? "#fff" : "transparent"}`,
                    outline:`2px solid ${noteForm.color===c ? c : "transparent"}`,
                    transition:"all .15s"
                  }}
                />
              ))}
            </div>
          </div>
          <button className="btn-p" onClick={saveNote}>
            {editNote ? "Update note" : "Save note"}
          </button>
          {editNote && (
            <button
              onClick={() => {
                setNotes(p => p.filter(x => x.id !== editNote));
                setEditNote(null);
                setSheet(null);
              }}
              style={{ color:"#ef4444", fontSize:14, fontWeight:600, padding:8 }}>
              Delete note
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}

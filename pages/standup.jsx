import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const B = {
  cobalt: "#2048C8", cobaltDark: "#0F2F8C", cobaltBright: "#4A74F5",
  banana: "#FCF1B8", carbon: "#0B0B0D", snow: "#FAF9F6", cream: "#F2EAD8",
  red: "#E03333", amber: "#D97706", green: "#16A34A",
};
const cobaltA = (a) => `rgba(32,72,200,${a})`;
const bananaA = (a) => `rgba(252,241,184,${a})`;
const whiteA  = (a) => `rgba(255,255,255,${a})`;

const F = {
  display: "'Lato',system-ui,sans-serif",
  ui: "'Archivo',system-ui,sans-serif",
  body: "'Lato',system-ui,sans-serif",
  mono: "'Lato',system-ui,sans-serif",
};

const ST = {
  deploy:  { bg: cobaltA(0.18), br: cobaltA(0.5),  tx: B.cobaltBright },
  high:    { bg: "rgba(217,119,6,0.12)",  br: "rgba(217,119,6,0.4)",  tx: "#F59E0B" },
  critical:{ bg: "rgba(224,51,51,0.1)",   br: "rgba(224,51,51,0.4)",  tx: "#F87171" },
  watch:   { bg: bananaA(0.08), br: bananaA(0.25),  tx: B.banana },
  done:    { bg: "rgba(22,163,74,0.08)",  br: "rgba(22,163,74,0.3)",  tx: "#4ADE80" },
  monitor: { bg: whiteA(0.03),  br: whiteA(0.08),   tx: whiteA(0.35) },
  kickoff: { bg: cobaltA(0.1),  br: cobaltA(0.3),   tx: B.cobaltBright },
  prep:    { bg: cobaltA(0.07), br: cobaltA(0.2),   tx: B.cobaltBright },
  blocked: { bg: "rgba(224,51,51,0.08)",  br: "rgba(224,51,51,0.3)",  tx: "#F87171" },
};
const sc = s => ST[s] || ST.monitor;

// ── Default data (fallback if no live data from Make) ─────────────────────────
const DEFAULT_BRANDS = [
  { id:"upful-blends",         name:"Upful Blends",         notionId:"2e172853cd8c808c9550c0525bbf0b4f", contact:"Chantel",       since:"Aug 2025", slack:"External-UpfulBlends",            todayStatus:"deploy",  focus:"Deploying today — RealOnes. No QA or schedule status confirmed. Verify immediately." },
  { id:"les-belles",           name:"Les Belles",            notionId:"2da72853cd8c80ebb7c4e472cf04b984", contact:"Cecile",        since:"Aug 2025", slack:"#external-lesbelles",             todayStatus:"high",    focus:"3 sends this week. Mother's Day offer [PLACEHOLDER] unfilled 13 days — ESCALATE. DressesThatDoEverything deploys today." },
  { id:"love-your-melon",      name:"Love Your Melon",       notionId:"2e272853cd8c8071884aec842f3f0b90", contact:"Zach",          since:"Jan 2026", slack:"External-loveyourmelon",           todayStatus:"watch",   focus:"BA + AC designs complete. Pending Zach approval. Welcome series (2 emails) kicking off." },
  { id:"hoodville",            name:"Hoodville",             notionId:"34472853cd8c80cab0d2d676dcd64c7f", contact:"Ome",           since:"Apr 2026", slack:"#internal-hoodville",             todayStatus:"done",    focus:"TheCookoutEdit deployed May 5. ToxicEra (05.02.26) In Draft — 4 days overdue. Deploy or skip decision needed today." },
  { id:"sweet-honey-farm",     name:"Sweet Honey Farm",      notionId:"2da72853cd8c804aa1d5d6702438aef6", contact:"—",             since:"Sep 2025", slack:"—",                               todayStatus:"monitor", focus:"Active account. No recent campaign data surfaced this cycle. Verify production status." },
  { id:"natural-blessings",    name:"Natural Blessings",     notionId:"33b72853cd8c80fcabdcc3c3486b99cd", contact:"Shashicka",    since:"Mar 2026", slack:"#external-lff-caechet-retention", todayStatus:"kickoff", focus:"Klaviyo to Privy migration kicking off. Audit existing flows before rebuild." },
  { id:"legacy-funded-futures",name:"Legacy Funded Futures", notionId:"32c72853cd8c800fb962d0e9bbc55291", contact:"Andrew Pires", since:"Mar 2026", slack:"#external-lff-caechet-retention", todayStatus:"monitor", focus:"Active account. No campaign data surfaced this cycle. Verify production status." },
];

const DEFAULT_WEEKLY = [
  {day:"MON 5/4",  brand:"Sweet Honey Farm",sub:"BCD",  name:"BCD_05.04.26_WhatHappensBehindClosedDoors_Members",type:"EMAIL",   s:"done",    note:"Deployed. Klaviyo · Leads"},
  {day:"TUE 5/5",  brand:"Hoodville",       sub:"",     name:"05.05.2026_HV_TheCookoutEdit_Caechet",             type:"EMAIL",   s:"done",    note:"Deployed. Flash sale 25% OFF"},
  {day:"WED 5/6",  brand:"Upful Blends",    sub:"",     name:"UB_05.06.26_RealOnes_Caechet",                     type:"EMAIL",   s:"deploy",  note:"Confirm QA + schedule NOW"},
  {day:"WED 5/6",  brand:"Les Belles",      sub:"",     name:"LB_05.06.26_DressesThatDoEverything",              type:"EMAIL",   s:"deploy",  note:"Confirm QA + schedule"},
  {day:"THU 5/7",  brand:"Sweet Honey Farm",sub:"BCD",  name:"BCD_05.07.26_MembersOnlyWhatsInside_Members",      type:"EMAIL",   s:"prep",    note:"Klaviyo · Leads · Founder letter"},
  {day:"THU 5/7",  brand:"Les Belles",      sub:"",     name:"LB_05.07.26_WeekendPreview_SMS",                   type:"SMS",     s:"prep",    note:"Status unknown — confirm"},
  {day:"FRI 5/8",  brand:"Upful Blends",    sub:"",     name:"UB_05.08.26_MothersDay_Launch_Caechet",            type:"EMAIL+SMS",s:"prep",   note:"20% off sitewide · Ready To Design"},
  {day:"FRI 5/8",  brand:"Sweet Honey Farm",sub:"Merch",name:"SHF_05.08.26_FitsForTheFearless_Merch",            type:"EMAIL",   s:"prep",    note:"Horsepower Ascent · Internal Review"},
  {day:"FRI 5/8",  brand:"Les Belles",      sub:"",     name:"LB_05.08.26_MothersDayPromo1",                     type:"EMAIL",   s:"blocked", note:"BLOCKED — [OFFER PLACEHOLDER] unfilled"},
  {day:"SAT 5/9",  brand:"Hoodville",       sub:"",     name:"05.09.2026_HV_SheRaisedALegend_Caechet",           type:"EMAIL",   s:"prep",    note:"Mother's Day adjacent — confirm"},
  {day:"SUN 5/10", brand:"Les Belles",      sub:"",     name:"LB_05.10.26_MothersDayLastChance",                 type:"EMAIL",   s:"prep",    note:"Cascades from Promo #1"},
];

const DEFAULT_APPROVALS = [
  {brand:"Les Belles",      asset:"Mother's Day Offer (Promo #1 · May 8)",    sent:"—", since:"Placeholder since Apr 23 · 13 days", fu:"ESCALATE NOW"},
  {brand:"Les Belles",      asset:"Memorial Day Offer (May 22–26)",           sent:"—", since:"Unfilled in calendar",               fu:"Needed this week"},
  {brand:"Love Your Melon", asset:"Browse Abandonment + Abandoned Cart Flows",sent:"Designs complete", since:"Awaiting Zach",       fu:"Follow up today"},
];

const DEFAULT_BLOCKERS = [
  {u:"critical",t:"Upful Blends RealOnes: No status in workspace. Confirmed send day. Verify QA + schedule immediately."},
  {u:"critical",t:"Les Belles Mother's Day Offer: [OFFER PLACEHOLDER] empty 13 days. Promo #1 is May 8. Copy fully blocked. Escalate to client now."},
  {u:"high",    t:"Les Belles May 10 Last Chance: Cascades from Promo #1. Two sends at risk if offer not confirmed today."},
  {u:"high",    t:"Hoodville ToxicEra: 4 days overdue, still In Draft. No deploy or skip decision. Resolve today."},
  {u:"watch",   t:"Love Your Melon flow activation: Designs complete. Stalled on Zach's approval. Daniel to follow up."},
  {u:"watch",   t:"LYM SMS: Only 235 credits until May 13. No SMS campaigns until plan activates."},
  {u:"prep",    t:"Natural Blessings migration (Klaviyo to Privy): Kicking off. Audit existing flows before any rebuild."},
];

const DEFAULT_MUST_WINS = [
  "Confirm and deploy UB_05.06.26_RealOnes_Caechet — QA, code, schedule confirmed before noon.",
  "Deploy LB_05.06.26_DressesThatDoEverything — confirm QA complete and send time.",
  "Get Les Belles Mother's Day offer confirmed from client. 13 days empty. Two sends cascade if this slips.",
];

// ── Shared storage via API (persists across devices/team members) ─────────────
async function safeGet(k) {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`/api/shared-storage?key=${encodeURIComponent(k)}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.value === null || d.value === undefined) return null;
    if (typeof d.value === "string") return JSON.parse(d.value);
    return d.value;
  } catch { return null; }
}

async function safeSet(k, v) {
  if (typeof window === "undefined") return;
  try {
    await fetch(`/api/shared-storage?key=${encodeURIComponent(k)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify(v) }),
    });
  } catch {}
}

// ── Notion comment via backend API ────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});

async function postCommentToNotion(brand, comment) {
  try {
    const res = await fetch("/api/notion-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: brand.notionId,
        comment: `STANDUP ${todayStr()}: ${comment}`,
      }),
    });
    return res.ok;
  } catch { return false; }
}

async function addNoteToNotionTask(taskName, note) {
  try {
    const res = await fetch("/api/notion-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchQuery: taskName,
        comment: `STANDUP NOTE ${todayStr()}: ${note}`,
      }),
    });
    return res.ok;
  } catch { return false; }
}

const uid = () => Math.random().toString(36).slice(2, 9);

// ── UI Components ─────────────────────────────────────────────────────────────
function CaechetMark({ size = 32, color = B.banana }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <g fill={color}>
        <rect x="56.54" y="-1.46" width="50.91" height="50.91" transform="rotate(45 92 64)" />
        <rect x="28.54" y="22.54" width="50.91" height="50.91" transform="rotate(45 64 88)" />
        <rect x="28.54" y="46.54" width="50.91" height="50.91" transform="rotate(45 64 112)" />
        <rect x="56.54" y="70.54" width="50.91" height="50.91" transform="rotate(45 92 136)" />
      </g>
    </svg>
  );
}

function CaechetWordmark({ size = 28, color = B.banana }) {
  return (
    <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1, whiteSpace: "nowrap", color, display: "inline-flex", alignItems: "flex-start" }}>
      cæchet<span style={{ fontSize: size * 0.22, marginLeft: "0.05em", marginTop: "0.18em", fontWeight: 700, color }}>®</span>
    </span>
  );
}

function Tag({ label, s }) {
  const c = sc(s);
  return <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", padding: "3px 10px", background: c.bg, color: c.tx, border: `1px solid ${c.br}`, textTransform: "uppercase", whiteSpace: "nowrap", display: "inline-block", borderRadius: 20 }}>{label}</span>;
}

function Tbl({ heads, rows, flagFn }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 12, borderRadius: 10, border: `1px solid ${cobaltA(0.1)}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{heads.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "10px 16px", borderBottom: `1px solid ${cobaltA(0.1)}`, fontFamily: F.mono, color: B.cobalt, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 700, background: cobaltA(0.03) }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, ri) => <tr key={ri} style={{ background: flagFn && flagFn(ri) ? "rgba(224,51,51,0.04)" : ri % 2 === 0 ? "#fff" : "#FAFBFF", borderBottom: `1px solid ${cobaltA(0.06)}` }}>{row.map((cell, ci) => <td key={ci} style={{ padding: "11px 16px", color: B.carbon, fontSize: 12, lineHeight: 1.5, verticalAlign: "top", fontFamily: F.body }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Sec({ n, title, open: def = false, children }) {
  const [open, setOpen] = useState(def);
  return (
    <div style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", boxShadow: open ? "0 2px 12px rgba(32,72,200,0.08), 0 1px 3px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.05)" }}>
      <button onClick={() => setOpen(p => !p)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "#fff", borderLeft: `4px solid ${open ? B.cobalt : cobaltA(0.2)}`, border: `1px solid ${open ? cobaltA(0.15) : cobaltA(0.08)}`, borderRadius: open ? "12px 12px 0 0" : 12, padding: "16px 22px", cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: "0.1em", background: open ? B.cobalt : cobaltA(0.25), padding: "3px 8px", borderRadius: 20, minWidth: 28, textAlign: "center", lineHeight: 1.4 }}>{String(n).padStart(2, "0")}</span>
        <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", color: B.cobalt, textTransform: "uppercase" }}>{title}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: open ? B.cobalt : cobaltA(0.4) }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div style={{ border: `1px solid ${cobaltA(0.1)}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "20px 24px 24px", background: "#fff" }}>{children}</div>}
    </div>
  );
}

function Label({ children, style = {} }) {
  return <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: B.cobalt, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12, ...style }}>{children}</div>;
}

function EditableList({ storageKey, title, placeholder }) {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { safeGet(storageKey).then(v => { if (v) setItems(v); setLoaded(true); }); }, [storageKey]);
  const save = useCallback(async nv => { setItems(nv); await safeSet(storageKey, nv); }, [storageKey]);
  const add = async () => { if (!input.trim()) return; await save([...items, { id: uid(), text: input.trim(), date: todayStr() }]); setInput(""); };
  const del = async id => await save(items.filter(i => i.id !== id));
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${cobaltA(0.12)}`, borderLeft: `4px solid ${B.cobalt}`, boxShadow: "0 1px 4px rgba(32,72,200,0.06)", padding: "18px 22px", marginBottom: 0, display:"flex", flexDirection:"column", height:"100%", minWidth:0, overflow:"hidden" }}>
      <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", color: B.cobalt, textTransform: "uppercase", marginBottom: 14 }}>{title}</div>
      {loaded && items.length === 0 && <div style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.3), marginBottom: 12, fontStyle: "italic" }}>No items yet</div>}
      {items.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 14px", background: cobaltA(0.03), borderRadius: 8, border: `1px solid ${cobaltA(0.08)}`, minWidth:0, overflow:"hidden" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.cobalt, flexShrink: 0, marginTop: 5 }} />
            <span style={{ fontSize: 13, color: B.carbon, fontFamily: F.body, flex: 1, wordBreak:"break-word", minWidth:0 }}>{item.text}</span>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: cobaltA(0.4) }}>{item.date}</span>
            <button onClick={() => del(item.id)} style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.4), background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}>✕</button>
          </div>
        ))}
      </div>}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} placeholder={placeholder}
          style={{ flex: 1, background: "#FAFBFF", border: `1px solid ${cobaltA(0.15)}`, borderRadius: 8, padding: "9px 14px", color: B.carbon, fontSize: 12, fontFamily: F.body, outline: "none" }} />
        <button onClick={add} style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "9px 18px", background: B.cobalt, color: B.banana, border: "none", cursor: "pointer", borderRadius: 8 }}>ADD</button>
      </div>
    </div>
  );
}

function NextSteps() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { safeGet("standup:next-steps").then(v => { if (v) setItems(v); setLoaded(true); }); }, []);
  const save = useCallback(async nv => { setItems(nv); await safeSet("standup:next-steps", nv); }, []);
  const add = async () => { if (!input.trim()) return; await save([...items, { id: uid(), text: input.trim(), created: todayStr() }]); setInput(""); };
  const del = async id => await save(items.filter(i => i.id !== id));
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${cobaltA(0.12)}`, borderLeft: `4px solid ${B.cobaltBright}`, boxShadow: "0 1px 4px rgba(32,72,200,0.06)", padding: "18px 22px", marginTop: 12 }}>
      <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", color: B.cobalt, textTransform: "uppercase", marginBottom: 4 }}>Next Steps</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: cobaltA(0.4), marginBottom: 14, letterSpacing: "0.1em" }}>SHARED ACROSS TEAM · VISIBLE TOMORROW</div>
      {loaded && items.length === 0 && <div style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.3), marginBottom: 12, fontStyle: "italic" }}>No next steps yet</div>}
      {items.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 14px", background: cobaltA(0.03), borderRadius: 8, border: `1px solid ${cobaltA(0.08)}`, minWidth:0, overflow:"hidden" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.cobaltBright, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: B.carbon, fontFamily: F.body, flex: 1, wordBreak:"break-word", minWidth:0 }}>{item.text}</span>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: cobaltA(0.4) }}>{item.created}</span>
            <button onClick={() => del(item.id)} style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.4), background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}>✕</button>
          </div>
        ))}
      </div>}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Add a next step..."
          style={{ flex: 1, background: "#FAFBFF", border: `1px solid ${cobaltA(0.15)}`, borderRadius: 8, padding: "9px 14px", color: B.carbon, fontSize: 12, fontFamily: F.body, outline: "none" }} />
        <button onClick={add} style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "9px 18px", background: B.cobalt, color: B.banana, border: "none", cursor: "pointer", borderRadius: 8 }}>ADD</button>
      </div>
    </div>
  );
}

function SectionNotes({ storageKey, selectItems, itemLabel = "Task" }) {
  const isMobile = useMobile();
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState("");
  const [syncing, setSyncing] = useState(null);
  const [syncSt, setSyncSt] = useState({});
  useEffect(() => {
    safeGet(storageKey).then(v => { if (v) setNotes(v); });
    if (selectItems.length) setSelected(selectItems[0].value);
  }, [storageKey]);
  const save = useCallback(async nv => { setNotes(nv); await safeSet(storageKey, nv); }, [storageKey]);
  const add = async () => {
    if (!input.trim() || !selected) return;
    const item = selectItems.find(i => i.value === selected);
    const id = uid();
    setSyncing(id); setSyncSt(p => ({ ...p, [id]: "syncing" }));
    const ok = await addNoteToNotionTask(selected, input.trim());
    const newNote = { id, taskName: selected, taskLabel: item?.label || selected, text: input.trim(), date: todayStr(), synced: ok };
    await save([...notes, newNote]);
    setSyncSt(p => ({ ...p, [id]: ok ? "ok" : "err" }));
    setSyncing(null); setInput("");
  };
  const retry = async (note) => {
    setSyncing(note.id); setSyncSt(p => ({ ...p, [note.id]: "syncing" }));
    const ok = await addNoteToNotionTask(note.taskName, note.text);
    await save(notes.map(n => n.id === note.id ? { ...n, synced: ok } : n));
    setSyncSt(p => ({ ...p, [note.id]: ok ? "ok" : "err" }));
    setSyncing(null);
  };
  const del = async id => await save(notes.filter(n => n.id !== id));
  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${cobaltA(0.08)}`, paddingTop: 18 }}>
      <Label>Notes</Label>
      {notes.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {notes.map(n => (
          <div key={n.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: cobaltA(0.03), borderRadius: 8, border: `1px solid ${cobaltA(0.1)}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: B.cobalt, background: cobaltA(0.1), padding: "2px 7px", borderRadius: 10 }}>{n.taskLabel}</span>
                <span style={{ fontFamily: F.mono, fontSize: 8, color: cobaltA(0.4) }}>{n.date}</span>
                {n.synced && <span style={{ fontFamily: F.mono, fontSize: 8, color: ST.done.tx }}>✓ NOTION</span>}
                {syncSt[n.id] === "syncing" && <span style={{ fontFamily: F.mono, fontSize: 8, color: cobaltA(0.4) }}>syncing...</span>}
                {syncSt[n.id] === "err" && !n.synced && <button onClick={() => retry(n)} style={{ fontFamily: F.mono, fontSize: 8, color: ST.critical.tx, background: "transparent", border: "none", cursor: "pointer" }}>↺ retry</button>}
              </div>
              <p style={{ fontSize: 12, color: B.carbon, lineHeight: 1.55, fontFamily: F.body, margin: 0 }}>{n.text}</p>
            </div>
            <button onClick={() => del(n.id)} style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.3), background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: B.cobalt, background: "#FAFBFF", border: `1px solid ${cobaltA(0.2)}`, borderRadius: 8, padding: "9px 10px", cursor: "pointer", outline: "none", flexShrink: 0, maxWidth: isMobile ? "100%" : 260, width: isMobile ? "100%" : "auto" }}>
          {selectItems.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={`Add a note for the selected ${itemLabel.toLowerCase()}...`}
          style={{ flex: 1, background: "#FAFBFF", border: `1px solid ${cobaltA(0.15)}`, borderRadius: 8, padding: "9px 14px", color: B.carbon, fontSize: 12, fontFamily: F.body, outline: "none" }} />
        <button onClick={add} disabled={syncing !== null || !input.trim()}
          style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "9px 18px", background: syncing ? cobaltA(0.4) : B.cobalt, color: B.banana, border: "none", cursor: syncing ? "default" : "pointer", borderRadius: 8, flexShrink: 0, whiteSpace: "nowrap" }}>
          {syncing ? "SAVING..." : "ADD NOTE"}
        </button>
      </div>
    </div>
  );
}

function BrandCard({ brand }) {
  const isMobile = useMobile();
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [syncing, setSyncing] = useState(null);
  const [syncSt, setSyncSt] = useState({});
  const key = `standup:comments:${brand.id}`;
  const c = sc(brand.todayStatus);
  useEffect(() => { safeGet(key).then(v => { if (v) setComments(v); }); }, [key]);
  const save = useCallback(async nv => { setComments(nv); await safeSet(key, nv); }, [key]);
  const add = async () => { if (!input.trim()) return; const nc = { id: uid(), text: input.trim(), date: todayStr(), synced: false }; await save([...comments, nc]); setInput(""); };
  const syncNotion = async cm => {
    setSyncing(cm.id); setSyncSt(p => ({ ...p, [cm.id]: "syncing" }));
    const ok = await postCommentToNotion(brand, cm.text);
    await save(comments.map(x => x.id === cm.id ? { ...x, synced: ok } : x));
    setSyncSt(p => ({ ...p, [cm.id]: ok ? "ok" : "err" })); setSyncing(null);
  };
  const del = async id => await save(comments.filter(x => x.id !== id));
  const labels = { deploy: "DEPLOY TODAY", high: "HIGH", critical: "CRITICAL", watch: "WATCH", done: "DEPLOYED", monitor: "MONITOR", kickoff: "KICKOFF", prep: "PREP" };
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${c.br}`, background: "#fff", marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${cobaltA(0.08)}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: c.bg }}>
        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em", color: B.cobalt }}>{brand.name}</span>
        <Tag label={labels[brand.todayStatus] || brand.todayStatus.toUpperCase()} s={brand.todayStatus} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
          {[["CONTACT", brand.contact], ["SINCE", brand.since]].map(([l, v]) => (
            <div key={l} style={{ textAlign: "right" }}>
              <div style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: cobaltA(0.5), letterSpacing: "0.1em" }}>{l}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: B.carbon }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 0 }}>
        <div style={{ padding: "14px 18px", borderRight: `1px solid ${cobaltA(0.08)}` }}>
          <Label>Today's Status</Label>
          <p style={{ fontSize: 12, color: B.carbon, lineHeight: 1.65, fontFamily: F.body, margin: 0 }}>{brand.focus}</p>
          {brand.slack !== "—" && <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: cobaltA(0.4), letterSpacing: "0.1em" }}>SLACK</span>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: B.cobalt }}>{brand.slack}</span>
          </div>}
        </div>
        <div style={{ padding: "14px 18px", background: "#FAFBFF" }}>
          <Label>Notes & Comments</Label>
          {comments.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10, maxHeight: 130, overflowY: "auto" }}>
            {comments.map(cm => (
              <div key={cm.id} style={{ padding: "7px 12px", background: "#fff", border: `1px solid ${cobaltA(0.1)}`, borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: B.carbon, lineHeight: 1.5, fontFamily: F.body, margin: 0 }}>{cm.text}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 8, color: cobaltA(0.4) }}>{cm.date}</span>
                    {cm.synced && <span style={{ fontFamily: F.mono, fontSize: 8, color: ST.done.tx }}>✓ NOTION</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {!cm.synced && <button onClick={() => syncNotion(cm)} disabled={syncing === cm.id}
                    style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: "0.06em", padding: "3px 8px", background: B.cobalt, color: B.banana, border: "none", cursor: "pointer", opacity: syncing === cm.id ? 0.5 : 1, borderRadius: 6 }}>
                    {syncing === cm.id ? "..." : syncSt[cm.id] === "err" ? "RETRY" : "→ NOTION"}
                  </button>}
                  <button onClick={() => del(cm.id)} style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.3), background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>✕</button>
                </div>
              </div>
            ))}
          </div>}
          <div style={{ display: "flex", gap: 6 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Add a note..." rows={2}
              style={{ flex: 1, background: "#fff", border: `1px solid ${cobaltA(0.15)}`, borderRadius: 8, padding: "8px 12px", color: B.carbon, fontSize: 11, fontFamily: F.body, resize: "none", outline: "none" }} />
            <button onClick={add} style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", padding: "0 12px", background: B.cobalt, color: B.banana, border: "none", cursor: "pointer", flexShrink: 0, borderRadius: 8 }}>ADD</button>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}>
        <a href="/api/logout" style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "8px 14px", background: cobaltA(0.08), color: cobaltA(0.5), border: `1px solid ${cobaltA(0.12)}`, borderRadius: 20, textDecoration: "none", display: "inline-block" }}>
          SIGN OUT
        </a>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useMobile();
  const [liveData, setLiveData] = useState(null);
  const [dataUpdated, setDataUpdated] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/standup")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) { setLiveData(d.data); setDataUpdated(d.date); }
      })
      .catch(() => {});
  }, []);

  const BRANDS  = liveData?.brands   || DEFAULT_BRANDS;
  const WEEKLY  = liveData?.weekly   || DEFAULT_WEEKLY;
  const APPROVALS = liveData?.approvals || DEFAULT_APPROVALS;
  const BLOCKERS  = liveData?.blockers  || DEFAULT_BLOCKERS;
  const MUST_WINS = liveData?.mustWins  || DEFAULT_MUST_WINS;

  const DATE_LABEL = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }).toUpperCase();

  return (
    <div style={{ fontFamily: F.body, background: "#FFFFFF", minHeight: "100vh", color: B.carbon }}>
      <Head>
        <title>CÆCHET Daily Standup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Lato:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          button{transition:opacity 0.1s;cursor:pointer}
          button:hover{opacity:.82}
          tr:hover td{background:rgba(32,72,200,0.04)!important}
          input:focus,textarea:focus{outline:none;border-color:rgba(32,72,200,0.5)!important}
          ::-webkit-scrollbar{width:3px;height:3px}
          ::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:rgba(32,72,200,0.3);border-radius:2px}
        `}</style>
      </Head>

      {/* HEADER */}
      <div style={{ background: B.cobalt }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: isMobile ? "16px 16px 16px" : "24px 48px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:8, background:"rgba(0,0,0,0.15)", padding: isMobile ? "8px 12px" : "9px 16px", marginBottom: isMobile ? 16 : 22, borderRadius:8, borderLeft:`3px solid ${B.banana}` }}>
            <span style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, color:B.banana, letterSpacing:"0.12em", whiteSpace:"nowrap", paddingTop:1 }}>
              {liveData ? "LIVE DATA" : "DEPLOY TODAY"}
            </span>
            <span style={{ fontSize:12, color:bananaA(0.85), lineHeight:1.5, fontFamily:F.body }}>
              {liveData
                ? `Updated from Notion · ${dataUpdated ? new Date(dataUpdated).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : ""}`
                : "UB_RealOnes + LB_DressesThatDoEverything · HV TheCookoutEdit deployed May 5 · LB Mother's Day Promo #1 (May 8) BLOCKED — 13 days unfilled"
              }
            </span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems: isMobile ? "flex-start" : "center", flexWrap:"wrap", gap: isMobile ? 12 : 20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:18 }}>
              <CaechetMark size={44} color={B.banana}/>
              <div>
                <CaechetWordmark size={30} color={B.banana}/>
                <div style={{ fontFamily:F.mono, fontSize:9, fontWeight:600, color:bananaA(0.7), letterSpacing:"0.16em", marginTop:5 }}>ADMIN PORTAL · {DATE_LABEL}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[
                { n: BRANDS.length, label: "brands", accent: bananaA(0.8) },
                { n: WEEKLY.filter(w=>w.s==="deploy").length, label: "deploying", accent: WEEKLY.filter(w=>w.s==="deploy").length > 0 ? B.banana : bananaA(0.35), highlight: WEEKLY.filter(w=>w.s==="deploy").length > 0 },
                { n: WEEKLY.filter(w=>w.s==="blocked").length, label: "blocked", accent: WEEKLY.filter(w=>w.s==="blocked").length > 0 ? "#F87171" : bananaA(0.3), highlight: WEEKLY.filter(w=>w.s==="blocked").length > 0 },
                { n: WEEKLY.filter(w=>w.s!=="done").length, label: "pending", accent: bananaA(0.5) },
              ].map(({ n, label, accent, highlight }) => (
                <div key={label} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"5px 11px",
                  background: highlight ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)",
                  borderRadius:20,
                  border: `1px solid ${highlight ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}>
                  <span style={{ fontFamily:F.display, fontSize:14, fontWeight:800, color:accent, lineHeight:1 }}>{n}</span>
                  <span style={{ fontFamily:F.mono, fontSize:8, fontWeight:600, color:bananaA(0.45), letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:16, fontFamily:F.mono, fontSize:9, fontWeight:600, letterSpacing:"0.26em", color:bananaA(0.5) }}>STAY DANGEROUS · BE HUMAN</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth:1060, margin:"0 auto", padding: isMobile ? "16px 16px 60px" : "32px 48px 80px" }}>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12, marginBottom:4, alignItems:"stretch", minWidth:0 }}>
          <EditableList storageKey="standup:next-steps" title="Next Steps From Yesterday" placeholder="Items added yesterday appear here for the whole team..." />
          <EditableList storageKey="standup:meeting-announcements" title="Announcements" placeholder="Add an announcement for today's standup..." />
        </div>
        <div style={{ height:8 }}/>

        {/* §01 Brand Updates */}
        <Sec n={1} title="Brand Updates" open={true}>
          <Label style={{ marginBottom:16 }}>
            {BRANDS.length} ACTIVE ACCOUNTS · COMMENTS SYNC TO NOTION
          </Label>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {BRANDS.map(b => <BrandCard key={b.id} brand={b}/>)}
          </div>
        </Sec>

        {/* §02 Campaigns Deploying This Week */}
        <Sec n={2} title="Campaigns Deploying This Week" open={true}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <Label style={{ marginBottom:0 }}>THIS WEEK · ALL BRANDS</Label>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {[["DEPLOYED",ST.done.tx,"done"],["DEPLOY TODAY",ST.deploy.tx,"deploy"],["BLOCKED",ST.critical.tx,"blocked"],["PREP",ST.prep.tx,"prep"]].map(([l,col,key])=>(
                <span key={l} style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, color:col, letterSpacing:"0.08em" }}>{l} <strong>{WEEKLY.filter(w=>w.s===key).length}</strong></span>
              ))}
            </div>
          </div>
          <Tbl heads={["Day","Brand","Campaign","Type","Status","Note"]}
            rows={WEEKLY.map(c=>{
              const isDone = c.s === "done";
              const isBlocked = c.s === "blocked";
              const isDeploy = c.s === "deploy";
              const fade = isDone ? 0.4 : 1;
              return [
                <span style={{ fontFamily:F.mono, fontSize:10, fontWeight:700, color:isDone?cobaltA(0.35):B.cobalt, textDecoration:isDone?"line-through":"none" }}>{c.day}</span>,
                <div style={{ opacity: fade }}>
                  <span style={{ fontFamily:F.ui, fontWeight:700, fontSize:12, color:B.carbon }}>{c.brand}</span>
                  {c.sub&&<span style={{ fontFamily:F.mono, fontSize:8, color:cobaltA(0.5), marginLeft:6 }}>{c.sub}</span>}
                </div>,
                <span style={{ fontFamily:F.mono, fontSize:10, color:isDone?cobaltA(0.4):B.carbon, textDecoration:isDone?"line-through":"none" }}>{c.name}</span>,
                <span style={{ fontFamily:F.mono, fontSize:8, fontWeight:600, padding:"3px 8px", opacity: isDone ? 0.5 : 1,
                  background:c.type&&c.type.includes("EMAIL")?cobaltA(0.1):"rgba(22,163,74,0.1)",
                  color:c.type&&c.type.includes("EMAIL")?B.cobalt:"#16A34A",
                  border:`1px solid ${c.type&&c.type.includes("EMAIL")?cobaltA(0.2):"rgba(22,163,74,0.2)"}`,
                  borderRadius:20 }}>{c.type}</span>,
                <Tag label={isDeploy?"DEPLOY TODAY":isDone?"DEPLOYED":isBlocked?"BLOCKED":"PREP"} s={c.s}/>,
                <span style={{ color:isBlocked?ST.critical.tx:isDone?cobaltA(0.4):B.carbon, fontSize:11, fontFamily:F.body, fontStyle:isDone?"italic":"normal" }}>{c.note}</span>
              ];
            })} flagFn={ri=>WEEKLY[ri]?.s==="blocked"}/>
          <SectionNotes storageKey="standup:campaign-notes" itemLabel="Campaign"
            selectItems={WEEKLY.map(c=>({ value:c.name, label:`${c.day} · ${c.brand}${c.sub?" ("+c.sub+")":""} — ${c.name}` }))}/>
        </Sec>

        {/* §03 Awaiting Client Approval */}
        <Sec n={3} title="Awaiting Client Approval" open={true}>
          <Tbl heads={["Brand","Asset","Date Sent","Waiting Since","Follow-Up"]} rows={APPROVALS.map(r=>[r.brand,r.asset,r.sent,r.since,r.fu])} flagFn={ri=>ri===0}/>
          <div style={{ marginTop:14, padding:"12px 16px", background:"rgba(224,51,51,0.04)", borderRadius:8, border:"1px solid rgba(224,51,51,0.15)", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontFamily:F.mono, fontSize:9, fontWeight:700, color:ST.critical.tx, letterSpacing:"0.1em", whiteSpace:"nowrap" }}>FLAG</span>
            <span style={{ fontSize:12, color:B.carbon, fontFamily:F.body, lineHeight:1.55 }}>LB Mother's Day placeholder since April 23 — 13 days. Promo #1 is May 8. Two sends at risk if not resolved today.</span>
          </div>
          <SectionNotes storageKey="standup:approval-notes" itemLabel="Approval"
            selectItems={APPROVALS.map(r=>({ value:r.asset, label:`${r.brand} — ${r.asset}` }))}/>
        </Sec>

        {/* §04 Blockers */}
        <Sec n={4} title="Blockers / Risks" open={true}>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
            {BLOCKERS.map((b,i)=>{ const c=sc(b.u); return(
              <div key={i} style={{ display:"flex", gap:14, padding:"12px 18px", background:c.bg, borderRadius:8, border:`1px solid ${c.br}`, alignItems:"flex-start" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:c.tx, flexShrink:0, marginTop:4 }}/>
                <span style={{ fontSize:13, color:B.carbon, lineHeight:1.55, fontFamily:F.body, flex:1 }}>{b.t}</span>
              </div>
            );})}
          </div>
        </Sec>

        {/* §05 Must-Wins */}
        <Sec n={5} title="Today's Must-Wins" open={true}>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
            {MUST_WINS.map((w,i)=>(
              <div key={i} style={{ display:"flex", gap:18, padding:"16px 20px", background:"#fff", borderRadius:10, border:`1px solid ${cobaltA(0.12)}`, boxShadow:"0 1px 4px rgba(32,72,200,0.06)", alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:B.cobalt, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:F.display, fontSize:16, fontWeight:800, color:B.banana, lineHeight:1 }}>{i+1}</span>
                </div>
                <p style={{ fontSize:13, color:B.carbon, lineHeight:1.65, fontFamily:F.body, paddingTop:6, margin:0 }}>{w}</p>
              </div>
            ))}
          </div>
        </Sec>

        <NextSteps/>

        <div style={{ height:1, background:cobaltA(0.08), margin:"32px 0" }}/>

        {/* §06 Performance */}
        <Sec n={6} title="Performance Watch">
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 20px", gap:14 }}>
            <CaechetMark size={44} color={cobaltA(0.12)}/>
            <div style={{ fontFamily:F.display, fontSize:22, fontWeight:800, letterSpacing:"0.06em", color:B.carbon, opacity:0.18, textTransform:"uppercase" }}>Coming Soon</div>
            <div style={{ fontFamily:F.mono, fontSize:9, fontWeight:600, color:B.carbon, opacity:0.18, letterSpacing:"0.16em" }}>CAMPAIGN PERFORMANCE DATA WILL APPEAR HERE</div>
          </div>
        </Sec>

        {/* Footer */}
        <div style={{ marginTop:40, padding:"16px 0", borderTop:`1px solid ${cobaltA(0.1)}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontFamily:F.mono, fontSize:9, fontWeight:600, color:cobaltA(0.35), letterSpacing:"0.1em" }}>
            {liveData ? "LIVE FROM NOTION · " : "LAST UPDATED · "}{DATE_LABEL}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <CaechetMark size={14} color={cobaltA(0.25)}/>
            <span style={{ fontFamily:F.mono, fontSize:9, fontWeight:600, letterSpacing:"0.18em", color:cobaltA(0.35) }}>STAY DANGEROUS · BE HUMAN</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}>
        <a href="/api/logout" style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "8px 14px", background: cobaltA(0.08), color: cobaltA(0.5), border: `1px solid ${cobaltA(0.12)}`, borderRadius: 20, textDecoration: "none", display: "inline-block" }}>
          SIGN OUT
        </a>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  const isAuthed = cookie.includes("caechet_auth=1");
  if (!isAuthed) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: {} };
}

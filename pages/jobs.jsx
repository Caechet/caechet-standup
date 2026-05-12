import Head from "next/head";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── design tokens (Caechet standup system) ───────────────────────────────────
const B = {
  cobalt: "#2048C8", cobaltDark: "#0F2F8C", cobaltBright: "#4A74F5",
  banana: "#FCF1B8", carbon: "#0B0B0D", snow: "#FAF9F6",
  red: "#E03333", amber: "#D97706", green: "#16A34A",
};
const cobaltA = (a) => `rgba(32,72,200,${a})`;
const bananaA = (a) => `rgba(252,241,184,${a})`;
const F = {
  display: "'Lato',system-ui,sans-serif",
  ui: "'Archivo',system-ui,sans-serif",
  body: "'Lato',system-ui,sans-serif",
  mono: "'Lato',system-ui,sans-serif",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}
function freshness(dateStr) {
  if (!dateStr) return "unknown";
  const s = String(dateStr).toLowerCase();
  // handle relative strings returned by the API
  if (s.includes("just now") || s.includes("minute") || s.includes("hour") && !s.match(/[2-9]\d*\s*hour/) && !s.match(/1[0-9]\s*hour/)) {
    if (s.match(/^(just|\d+\s*(m|min|minute|hour|hr))/)) return s.match(/hour|hr/) && s.match(/[2-9]\s*(hour|hr)/) ? "fresh" : "hot";
  }
  if (s.match(/(\d+)\s*(h|hr|hour)s?/)) {
    const hrs = parseInt(s.match(/(\d+)\s*(h|hr|hour)s?/)[1]);
    if (hrs < 1) return "hot";
    if (hrs < 24) return "fresh";
    return "recent";
  }
  if (s.match(/(\d+)\s*(m|min|minute)s?/)) return "hot";
  if (s.match(/(\d+)\s*day/)) {
    const days = parseInt(s.match(/(\d+)\s*day/)[1]);
    if (days <= 1) return "fresh";
    if (days <= 3) return "recent";
    return "old";
  }
  if (s.includes("today") || s.includes("just")) return "fresh";
  if (s.includes("yesterday")) return "fresh";
  if (s.includes("week")) return "old";
  // fall back to date parse
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (isNaN(diff)) return "unknown";
  if (diff < 3600) return "hot";
  if (diff < 86400) return "fresh";
  if (diff < 259200) return "recent";
  return "old";
}
const FRESH = { hot: B.red, fresh: B.amber, recent: B.green, old: cobaltA(0.3), unknown: cobaltA(0.2) };

// ─── prompts ──────────────────────────────────────────────────────────────────
const SEARCH_SYSTEM = `You are a job board crawler for DTC and SaaS companies in the United States.

Do exactly 2 web searches:
Search 1: keyword + jobs site:linkedin.com/jobs OR site:wellfound.com/jobs "United States"
Search 2: keyword + jobs site:boards.greenhouse.io OR site:jobs.lever.co "United States"

FILTERS:
- Company type: follow the filter in the user message
- Location: United States only (including Remote US)
- Recency: prefer last 14 days

Your ENTIRE response must be a single raw JSON object. Start with { and end with }. No prose, no markdown.
{
  "jobs": [
    {
      "id": "unique-slug",
      "title": "Job Title",
      "company": "Company Name",
      "companyType": "DTC or SaaS",
      "location": "City, State or Remote (US)",
      "source": "LinkedIn / Wellfound / BuiltIn / Greenhouse / etc",
      "postedAt": "ISO 8601 date, estimate if needed",
      "url": "direct link to job posting",
      "tags": ["one-or-two tags"],
      "snippet": "max 15 words about the role"
    }
  ],
  "total": number,
  "query": "keyword used"
}
Return the most recent 50 jobs. Sort strictly by most recently posted first. Keep snippets under 15 words. Keep tags to 1-2 items. Omit null/empty fields.`;

const SCRAPE_SYSTEM = `You are a job posting data extractor. Extract structured data from a job URL or text.
Your ENTIRE response must be a single raw JSON object. Start with { and end with }. No prose, no markdown.
{
  "title": "Job title or null",
  "company": "Company name or null",
  "location": "Location or null",
  "salary": "Salary range or null",
  "type": "Full-time / Part-time / Contract / etc. or null",
  "experience": "Experience required or null",
  "skills": ["skill1", "skill2"],
  "responsibilities": ["resp1", "resp2"],
  "benefits": ["benefit1"],
  "applyUrl": "Application URL or null",
  "postedAt": "ISO 8601 date if found or null",
  "summary": "2-3 sentence summary"
}`;

// ─── api ──────────────────────────────────────────────────────────────────────
async function callClaude(system, userMsg, useSearch = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout
  let res;
  try {
    res = await fetch("/api/job-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, userMsg, useSearch }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.raw || `API error: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const allText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  if (!allText.trim()) throw new Error("Empty response from API");
  const cleaned = allText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON found");
  const jsonStr = cleaned.slice(start);
  try { return JSON.parse(jsonStr); } catch {
    const hits = []; const re = /\{[^{}]*"title"[^{}]*\}/g; let m;
    while ((m = re.exec(jsonStr)) !== null) { try { hits.push(JSON.parse(m[0])); } catch {} }
    if (hits.length) return { jobs: hits, total: hits.length, query: "" };
    throw new Error("Malformed JSON");
  }
}

// ─── ui primitives ────────────────────────────────────────────────────────────
function CaechetMark({ size = 28, color = B.banana }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
      <g fill={color}>
        <rect x="56.54" y="-1.46" width="50.91" height="50.91" transform="rotate(45 92 64)" />
        <rect x="28.54" y="22.54" width="50.91" height="50.91" transform="rotate(45 64 88)" />
        <rect x="28.54" y="46.54" width="50.91" height="50.91" transform="rotate(45 64 112)" />
        <rect x="56.54" y="70.54" width="50.91" height="50.91" transform="rotate(45 92 136)" />
      </g>
    </svg>
  );
}

function Tag({ label, type = "default" }) {
  const S = {
    dtc:     { bg: "rgba(176,107,224,0.1)", br: "rgba(176,107,224,0.3)", tx: "#b06be0" },
    saas:    { bg: cobaltA(0.1),            br: cobaltA(0.3),            tx: B.cobaltBright },
    new:     { bg: bananaA(0.18),           br: bananaA(0.45),           tx: "#806010" },
    source:  { bg: cobaltA(0.05),           br: cobaltA(0.12),           tx: cobaltA(0.55) },
    salary:  { bg: "rgba(22,163,74,0.08)",  br: "rgba(22,163,74,0.25)",  tx: B.green },
    all:     { bg: cobaltA(0.04),           br: cobaltA(0.1),            tx: cobaltA(0.5) },
    default: { bg: cobaltA(0.04),           br: cobaltA(0.1),            tx: cobaltA(0.5) },
  };
  const s = S[type] || S.default;
  return (
    <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 20, display: "inline-block", background: s.bg, color: s.tx, border: `1px solid ${s.br}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function MonoLabel({ children, style = {} }) {
  return <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: B.cobalt, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, ...style }}>{children}</div>;
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${cobaltA(0.2)}`, borderTopColor: B.cobalt, borderRadius: "50%", animation: "spin 0.6s linear infinite", verticalAlign: "middle" }} />;
}

function CobaltBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "9px 20px", background: disabled ? cobaltA(0.2) : B.cobalt, color: disabled ? cobaltA(0.35) : B.banana, border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function Inp({ value, onChange, onKeyDown, placeholder, style = {} }) {
  return (
    <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
      style={{ flex: 1, background: "#FAFBFF", border: `1px solid ${cobaltA(0.15)}`, borderRadius: 8, padding: "9px 14px", color: B.carbon, fontSize: 12, fontFamily: F.body, outline: "none", ...style }}
      onFocus={e => (e.target.style.borderColor = cobaltA(0.5))}
      onBlur={e => (e.target.style.borderColor = cobaltA(0.15))}
    />
  );
}

function Card({ children, accent = B.cobalt, style = {} }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${cobaltA(0.1)}`, borderLeft: `4px solid ${accent}`, boxShadow: "0 2px 12px rgba(32,72,200,0.07), 0 1px 3px rgba(0,0,0,0.05)", padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

// ─── job card ─────────────────────────────────────────────────────────────────
function JobCard({ job, isNew, onDetail }) {
  const f = freshness(job.postedAt);
  const fc = FRESH[f];
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${isNew ? bananaA(0.5) : cobaltA(0.1)}`, background: "#fff", boxShadow: isNew ? `0 2px 14px ${bananaA(0.2)}` : "0 1px 3px rgba(0,0,0,0.05)", animation: isNew ? "slideIn 0.3s ease" : "none" }}>
      {isNew && <div style={{ height: 3, background: B.banana }} />}
      {/* header */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${cobaltA(0.07)}`, background: isNew ? bananaA(0.05) : cobaltA(0.02), display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", color: B.cobalt }}>{job.title}</span>
        {isNew && <Tag label="NEW" type="new" />}
        {job.companyType && <Tag label={job.companyType} type={job.companyType === "DTC" ? "dtc" : job.companyType === "SaaS" ? "saas" : "default"} />}
        <div style={{ marginLeft: "auto" }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", padding: "4px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5, background: `${fc}18`, border: `1px solid ${fc}55`, color: fc, whiteSpace: "nowrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: fc, display: "inline-block", flexShrink: 0, boxShadow: f === "hot" ? `0 0 6px ${fc}` : "none" }} />
            {timeAgo(job.postedAt)}
          </span>
        </div>
      </div>
      {/* body */}
      <div style={{ padding: "12px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 13, color: B.carbon, marginBottom: 2 }}>
            {job.company}
            {job.location && <span style={{ fontFamily: F.mono, fontSize: 10, color: cobaltA(0.45), marginLeft: 10 }}>{job.location}</span>}
          </div>
          {job.snippet && <p style={{ fontSize: 12, color: cobaltA(0.65), lineHeight: 1.6, fontFamily: F.body, margin: "6px 0 10px" }}>{job.snippet}</p>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {job.source && <Tag label={job.source} type="source" />}
            {(job.tags || []).slice(0, 2).map((t, i) => <Tag key={i} label={t} />)}
            {job.salary && <Tag label={job.salary} type="salary" />}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 14px", background: cobaltA(0.06), color: B.cobalt, border: `1px solid ${cobaltA(0.15)}`, borderRadius: 8, textDecoration: "none", textAlign: "center", display: "block" }}
              onMouseEnter={e => (e.target.style.background = cobaltA(0.12))}
              onMouseLeave={e => (e.target.style.background = cobaltA(0.06))}
            >VIEW ↗</a>
          )}
          <button onClick={() => onDetail(job)}
            style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 14px", background: B.cobalt, color: B.banana, border: "none", borderRadius: 8, cursor: "pointer" }}
            onMouseEnter={e => (e.target.style.opacity = "0.82")}
            onMouseLeave={e => (e.target.style.opacity = "1")}
          >DETAILS</button>
        </div>
      </div>
    </div>
  );
}

// ─── app ──────────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [tab, setTab] = useState("search");
  const [keyword, setKeyword] = useState("");
  const [locationFilter, setLocationFilter] = useState("United States");
  const [industryFilter, setIndustryFilter] = useState("both");
  const [allJobs, setAllJobs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);
  const [lastSearched, setLastSearched] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertInterval, setAlertInterval] = useState(5);
  const [alertKeyword, setAlertKeyword] = useState("");
  const [alertLog, setAlertLog] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const intervalRef = useRef(null);
  const [scrapeInput, setScrapeInput] = useState("");
  const [scrapeMode, setScrapeMode] = useState("url");
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [scrapeErr, setScrapeErr] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // auto-load Make.com cached results on page mount
  useEffect(() => {
    fetch("/api/job-results")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.jobs?.length > 0) {
          const sorted = [...d.jobs].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
          setAllJobs(sorted);
          setJobs(sorted);
          setCachedAt(d.cachedAt);
          setLastSearched({ kw: "auto", loc: "United States", ind: "both" });
        }
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async (kw, loc, ind, isAlert = false) => {
    if (!kw.trim()) return;
    if (!isAlert) { setSearching(true); setSearchErr(null); }
    try {
      const indLabel = ind === "dtc" ? "DTC brands only" : ind === "saas" ? "SaaS companies only" : ind === "all" ? "any company type" : "DTC brands and SaaS companies";
      const indFilter = ind === "all"
        ? "Include all company types — DTC, SaaS, agencies, enterprises, startups, nonprofits, anything relevant."
        : "Only include DTC brands or SaaS companies.";
      const msg = `Search for "${kw}" jobs at ${indLabel} in ${loc || "the United States"}.\nCrawl LinkedIn, Wellfound, BuiltIn, Greenhouse boards, Lever boards, Workday, Glassdoor, ZipRecruiter.\nOnly include US-based or Remote-US roles. ${indFilter}`;
      const data = await callClaude(SEARCH_SYSTEM, msg, true);
      const incoming = (data.jobs || []).map(j => ({ ...j, id: j.id || `${j.company}-${j.title}-${Date.now()}`.replace(/\s/g, "") }));
      if (isAlert) {
        setJobs(prev => {
          const ids = new Set(prev.map(j => j.id));
          const fresh = incoming.filter(j => !ids.has(j.id));
          if (fresh.length) {
            setNewIds(s => { const n = new Set(s); fresh.forEach(j => n.add(j.id)); return n; });
            setNotifCount(c => c + fresh.length);
            setAlertLog(log => [{ time: new Date().toLocaleTimeString(), count: fresh.length, kw }, ...log.slice(0, 9)]);
            return [...fresh, ...prev].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
          }
          return prev;
        });
      } else {
        incoming.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
        setAllJobs(incoming); setJobs(incoming); setNewIds(new Set()); setLastSearched({ kw, loc, ind });
      }
    } catch (e) { if (!isAlert) setSearchErr(e.message); }
    finally { if (!isAlert) setSearching(false); }
  }, []);

  useEffect(() => {
    if (alertEnabled && alertKeyword) intervalRef.current = setInterval(() => doSearch(alertKeyword, locationFilter, industryFilter, true), alertInterval * 60000);
    return () => clearInterval(intervalRef.current);
  }, [alertEnabled, alertKeyword, alertInterval, locationFilter, industryFilter, doSearch]);

  const handleDetail = async (job) => {
    setDetailJob(job); setDetailData(null);
    if (!job.url) return;
    setDetailLoading(true);
    try { setDetailData(await callClaude(SCRAPE_SYSTEM, `Extract job posting from: ${job.url}`, true)); } catch {}
    setDetailLoading(false);
  };

  const doScrape = async () => {
    if (!scrapeInput.trim()) return;
    setScraping(true); setScrapeErr(null); setScrapeResult(null);
    try {
      const msg = scrapeMode === "url" ? `Extract job posting from URL: ${scrapeInput.trim()}` : `Extract job posting from text:\n\n${scrapeInput.trim()}`;
      setScrapeResult(await callClaude(SCRAPE_SYSTEM, msg, scrapeMode === "url"));
    } catch { setScrapeErr("Could not parse. Try pasting text instead."); }
    setScraping(false);
  };

  const DATE_LABEL = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();

  return (
    <div style={{ fontFamily: F.body, background: "#fff", minHeight: "100vh", color: B.carbon }}>
      <Head>
        <title>CÆCHET · Job Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Lato:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        button{transition:opacity 0.1s;cursor:pointer}
        button:hover{opacity:0.82}
        input:focus,textarea:focus{outline:none;border-color:rgba(32,72,200,0.5)!important}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(32,72,200,0.3);border-radius:2px}
        ::placeholder{color:rgba(32,72,200,0.28)}
        tr:hover td{background:rgba(32,72,200,0.03)!important}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: B.cobalt }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 40px 0" }}>

          {/* live alert banner */}
          {alertEnabled && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(0,0,0,0.15)", padding: "9px 16px", marginBottom: 20, borderRadius: 8, borderLeft: `3px solid ${B.banana}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: B.banana, letterSpacing: "0.12em", whiteSpace: "nowrap", paddingTop: 1 }}>LIVE WATCH</span>
              <span style={{ fontSize: 12, color: bananaA(0.85), lineHeight: 1.5, fontFamily: F.body }}>
                Monitoring <strong style={{ color: B.banana }}>"{alertKeyword}"</strong> every {alertInterval}m
                {alertLog[0] && ` · Last hit: +${alertLog[0].count} @ ${alertLog[0].time}`}
              </span>
            </div>
          )}

          {/* logo row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <CaechetMark size={44} color={B.banana} />
              <div>
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 26, letterSpacing: "-0.035em", color: B.banana, display: "block", lineHeight: 1 }}>
                  cæchet<sup style={{ fontSize: 11, fontWeight: 700 }}>®</sup>
                </span>
                <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: bananaA(0.55), letterSpacing: "0.16em", marginTop: 5 }}>
                  JOB MONITOR · {DATE_LABEL}
                </div>
              </div>
            </div>

            {/* stat pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { n: jobs.length, label: "found" },
                { n: jobs.filter(j => newIds.has(j.id)).length, label: "new", hi: jobs.filter(j => newIds.has(j.id)).length > 0 },
                { n: jobs.filter(j => j.companyType === "DTC").length, label: "DTC" },
                { n: jobs.filter(j => j.companyType === "SaaS").length, label: "SaaS" },
              ].map(({ n, label, hi }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: hi ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)", borderRadius: 20, border: `1px solid ${hi ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                  <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: hi ? B.banana : bananaA(0.8), lineHeight: 1 }}>{n}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 600, color: bananaA(0.4), letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
                </div>
              ))}
              {notifCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(224,51,51,0.2)", borderRadius: 20, border: "1px solid rgba(224,51,51,0.4)" }}>
                  <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: "#F87171", lineHeight: 1 }}>{notifCount}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 600, color: "rgba(248,113,113,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>alerts</span>
                </div>
              )}
            </div>
            <Link href="/" style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "7px 14px", background: "rgba(255,255,255,0.08)", color: bananaA(0.6), border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, textDecoration: "none", marginLeft: 8 }}>
              ← STANDUP
            </Link>
          </div>

          <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.26em", color: bananaA(0.38) }}>STAY DANGEROUS · BE HUMAN</div>

          {/* tabs */}
          <div style={{ display: "flex", gap: 2, marginTop: 20, alignItems: "flex-end" }}>
            {[{ id: "search", label: "SEARCH" }, { id: "scrape", label: "SCRAPER" }].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", padding: "10px 22px", background: tab === id ? "#fff" : "transparent", color: tab === id ? B.cobalt : bananaA(0.45), border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 40px 80px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ══ SEARCH TAB ══ */}
          {tab === "search" && (
            <>
              {/* search card */}
              <Card accent={B.cobalt} style={{ marginBottom: 12 }}>
                <MonoLabel>Search</MonoLabel>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 2, minWidth: 180 }}>
                    <div style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: cobaltA(0.4), letterSpacing: "0.12em", marginBottom: 6 }}>KEYWORD</div>
                    <Inp value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch(keyword, locationFilter, industryFilter)} placeholder="email marketing, lifecycle, growth..." />
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: cobaltA(0.4), letterSpacing: "0.12em", marginBottom: 6 }}>US LOCATION</div>
                    <Inp value={locationFilter} onChange={e => setLocationFilter(e.target.value)} placeholder="United States, Remote, NYC..." />
                  </div>
                  <CobaltBtn onClick={() => doSearch(keyword, locationFilter, industryFilter)} disabled={searching || !keyword.trim()}>
                    {searching ? <><Spinner /> SEARCHING</> : "SEARCH"}
                  </CobaltBtn>
                </div>

                {/* industry filters */}
                <div style={{ display: "flex", gap: 6, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: cobaltA(0.38), letterSpacing: "0.12em", marginRight: 4 }}>INDUSTRY</span>
                  {[["both", "DTC + SaaS"], ["dtc", "DTC"], ["saas", "SaaS"], ["all", "All"]].map(([val, label]) => (
                    <button key={val} onClick={() => { setIndustryFilter(val); setJobs(val === "all" ? allJobs : val === "both" ? allJobs.filter(j => !j.companyType || j.companyType.toLowerCase().includes("dtc") || j.companyType.toLowerCase().includes("saas")) : allJobs.filter(j => j.companyType && j.companyType.toLowerCase().includes(val.toLowerCase()))); }} style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 14px", borderRadius: 20, border: `1px solid ${industryFilter === val ? B.cobalt : cobaltA(0.14)}`, background: industryFilter === val ? cobaltA(0.08) : "#FAFBFF", color: industryFilter === val ? B.cobalt : cobaltA(0.38), cursor: "pointer", transition: "all 0.15s" }}>{label}</button>
                  ))}
                </div>
              </Card>

              {/* alert card */}
              <Card accent={B.cobaltBright} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <MonoLabel style={{ marginBottom: 0 }}>
                    {alertEnabled
                      ? <><span style={{ width: 7, height: 7, borderRadius: "50%", background: B.cobalt, display: "inline-block", animation: "pulse 1.5s ease-in-out infinite", marginRight: 6 }} />Alert Active</>
                      : "Alert Monitor"
                    }
                  </MonoLabel>
                  <Inp value={alertKeyword} onChange={e => setAlertKeyword(e.target.value)} placeholder="Keyword to watch..." style={{ flex: "none", width: 190 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: cobaltA(0.4) }}>Every</span>
                    <select value={alertInterval} onChange={e => setAlertInterval(Number(e.target.value))} style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: B.cobalt, background: "#FAFBFF", border: `1px solid ${cobaltA(0.2)}`, borderRadius: 8, padding: "7px 10px", outline: "none" }}>
                      {[1, 2, 5, 10, 15, 30].map(v => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </div>
                  <button onClick={() => { if (!alertKeyword.trim()) return; setAlertEnabled(v => !v); setNotifCount(0); }} disabled={!alertKeyword.trim()} style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "7px 18px", borderRadius: 8, background: alertEnabled ? "rgba(224,51,51,0.08)" : cobaltA(0.07), color: alertEnabled ? B.red : cobaltA(0.55), border: `1px solid ${alertEnabled ? "rgba(224,51,51,0.25)" : cobaltA(0.14)}`, cursor: !alertKeyword.trim() ? "not-allowed" : "pointer" }}>
                    {alertEnabled ? "■ STOP" : "▶ START"}
                  </button>
                  {alertLog.slice(0, 2).map((l, i) => (
                    <span key={i} style={{ fontFamily: F.mono, fontSize: 9, color: B.cobaltBright, background: cobaltA(0.07), border: `1px solid ${cobaltA(0.14)}`, borderRadius: 20, padding: "3px 10px" }}>+{l.count} @ {l.time}</span>
                  ))}
                </div>
              </Card>

              {/* error */}
              {searchErr && (
                <div style={{ background: "rgba(224,51,51,0.06)", border: "1px solid rgba(224,51,51,0.22)", borderRadius: 10, padding: "12px 18px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: B.red, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>ERROR</span>
                  <span style={{ fontSize: 12, color: B.carbon, fontFamily: F.body }}>{searchErr}</span>
                </div>
              )}

              {/* results header */}
              {lastSearched && jobs.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: cobaltA(0.45), letterSpacing: "0.1em" }}>
                    {jobs.length} RESULTS{lastSearched.ind && lastSearched.ind !== "both" ? ` · ${lastSearched.ind.toUpperCase()}` : ""} · NEWEST FIRST{cachedAt ? <span style={{color:B.green,marginLeft:10}}>· AUTO-UPDATED {new Date(cachedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span> : lastSearched.kw !== "auto" ? <span style={{marginLeft:8}}>· "{lastSearched.kw.toUpperCase()}"</span> : null}
                  </span>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[["hot","< 1h",B.red],["fresh","< 24h",B.amber],["recent","< 3d",B.green]].map(([f,l,col])=>(
                      <span key={f} style={{ display:"flex",alignItems:"center",gap:5,fontFamily:F.mono,fontSize:8,color:cobaltA(0.4) }}>
                        <span style={{ width:7,height:7,borderRadius:"50%",background:col,display:"inline-block" }}/>{l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* empty state */}
              {jobs.length === 0 && !searching && !searchErr && (
                <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${cobaltA(0.08)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 20px", gap: 16 }}>
                  <CaechetMark size={40} color={cobaltA(0.1)} />
                  <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", color: B.carbon, opacity: 0.15, textTransform: "uppercase" }}>Ready to Search</div>
                  <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: B.carbon, opacity: 0.15, letterSpacing: "0.16em" }}>LINKEDIN · WELLFOUND · BUILTIN · GREENHOUSE · LEVER</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {jobs.map(job => <JobCard key={job.id} job={job} isNew={newIds.has(job.id)} onDetail={handleDetail} />)}
              </div>
            </>
          )}

          {/* ══ SCRAPER TAB ══ */}
          {tab === "scrape" && (
            <>
              <Card accent={B.cobalt} style={{ marginBottom: 20 }}>
                <MonoLabel>Extract Job Posting</MonoLabel>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {["url","text"].map(m => (
                    <button key={m} onClick={() => { setScrapeMode(m); setScrapeInput(""); }} style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 14px", borderRadius: 20, border: `1px solid ${scrapeMode===m?B.cobalt:cobaltA(0.14)}`, background: scrapeMode===m?cobaltA(0.08):"#FAFBFF", color: scrapeMode===m?B.cobalt:cobaltA(0.35), cursor: "pointer" }}>
                      {m==="url"?"URL":"PASTE TEXT"}
                    </button>
                  ))}
                </div>
                {scrapeMode === "url"
                  ? <Inp value={scrapeInput} onChange={e=>setScrapeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doScrape()} placeholder="https://jobs.company.com/posting/..." />
                  : <textarea value={scrapeInput} onChange={e=>setScrapeInput(e.target.value)} placeholder="Paste job posting text..." rows={5} style={{ width:"100%",background:"#FAFBFF",border:`1px solid ${cobaltA(0.15)}`,borderRadius:8,color:B.carbon,padding:"10px 14px",fontSize:12,fontFamily:F.body,resize:"vertical",outline:"none",lineHeight:1.6 }} onFocus={e=>(e.target.style.borderColor=cobaltA(0.5))} onBlur={e=>(e.target.style.borderColor=cobaltA(0.15))} />
                }
                <div style={{ display:"flex",justifyContent:"flex-end",marginTop:12 }}>
                  <CobaltBtn onClick={doScrape} disabled={scraping||!scrapeInput.trim()}>{scraping?<><Spinner/>EXTRACTING</>:"EXTRACT"}</CobaltBtn>
                </div>
              </Card>

              {scrapeErr && (
                <div style={{ background:"rgba(224,51,51,0.06)",border:"1px solid rgba(224,51,51,0.22)",borderRadius:10,padding:"12px 18px",marginBottom:16,display:"flex",gap:10 }}>
                  <span style={{ fontFamily:F.mono,fontSize:9,fontWeight:700,color:B.red,letterSpacing:"0.1em" }}>ERROR</span>
                  <span style={{ fontSize:12,color:B.carbon,fontFamily:F.body }}>{scrapeErr}</span>
                </div>
              )}

              {scrapeResult && (
                <Card accent={B.cobaltBright}>
                  <div style={{ background:cobaltA(0.03),borderRadius:10,border:`1px solid ${cobaltA(0.08)}`,padding:"16px 20px",marginBottom:18 }}>
                    <div style={{ fontFamily:F.ui,fontSize:18,fontWeight:700,color:B.cobalt,marginBottom:4 }}>{scrapeResult.title||"—"}</div>
                    <div style={{ fontFamily:F.mono,fontSize:10,color:cobaltA(0.55),marginBottom:8 }}>{[scrapeResult.company,scrapeResult.location,scrapeResult.type].filter(Boolean).join(" · ")}</div>
                    {scrapeResult.summary&&<p style={{ fontSize:12,color:cobaltA(0.65),lineHeight:1.7,fontFamily:F.body,margin:0 }}>{scrapeResult.summary}</p>}
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                    {[["SALARY",scrapeResult.salary],["EXPERIENCE",scrapeResult.experience],["TYPE",scrapeResult.type],["POSTED",scrapeResult.postedAt?timeAgo(scrapeResult.postedAt):null]].map(([label,val])=>
                      val?(<div key={label} style={{ background:cobaltA(0.03),borderRadius:8,padding:"10px 14px",border:`1px solid ${cobaltA(0.08)}` }}>
                        <div style={{ fontFamily:F.mono,fontSize:8,fontWeight:700,color:cobaltA(0.4),letterSpacing:"0.12em",marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:13,color:B.carbon,fontFamily:F.body }}>{val}</div>
                      </div>):null
                    )}
                  </div>
                  {[["SKILLS",scrapeResult.skills],["RESPONSIBILITIES",scrapeResult.responsibilities],["BENEFITS",scrapeResult.benefits]].map(([label,items])=>
                    items?.length?(<div key={label} style={{ background:cobaltA(0.02),borderRadius:8,padding:"12px 14px",marginBottom:10,border:`1px solid ${cobaltA(0.07)}` }}>
                      <div style={{ fontFamily:F.mono,fontSize:8,fontWeight:700,color:cobaltA(0.4),letterSpacing:"0.12em",marginBottom:10 }}>{label}</div>
                      <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{items.map((item,i)=><Tag key={i} label={item}/>)}</div>
                    </div>):null
                  )}
                  <div style={{ paddingTop:14,borderTop:`1px solid ${cobaltA(0.08)}` }}>
                    <button onClick={()=>navigator.clipboard.writeText(JSON.stringify(scrapeResult,null,2))} style={{ fontFamily:F.mono,fontSize:9,fontWeight:700,letterSpacing:"0.1em",padding:"7px 16px",borderRadius:8,border:`1px solid ${cobaltA(0.14)}`,background:"#FAFBFF",color:cobaltA(0.55),cursor:"pointer" }}>COPY JSON</button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* ── DETAIL PANEL ── */}
        {detailJob && (
          <div style={{ width:300,flexShrink:0,background:"#fff",borderRadius:12,border:`1px solid ${cobaltA(0.1)}`,borderLeft:`4px solid ${B.cobaltBright}`,boxShadow:"0 2px 12px rgba(32,72,200,0.08)",padding:"20px",position:"sticky",top:28,maxHeight:"calc(100vh - 56px)",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <MonoLabel style={{ marginBottom:0 }}>Detail</MonoLabel>
              <button onClick={()=>{setDetailJob(null);setDetailData(null);}} style={{ fontFamily:F.mono,fontSize:11,color:cobaltA(0.35),background:"transparent",border:"none",cursor:"pointer",padding:"2px 6px" }}>✕</button>
            </div>
            <div style={{ fontFamily:F.ui,fontSize:14,fontWeight:700,color:B.cobalt,marginBottom:4,lineHeight:1.3 }}>{detailJob.title}</div>
            <div style={{ fontFamily:F.mono,fontSize:10,color:cobaltA(0.55),marginBottom:3 }}>{detailJob.company}</div>
            <div style={{ fontFamily:F.mono,fontSize:9,color:cobaltA(0.4),marginBottom:14 }}>{detailJob.location}</div>
            {detailJob.snippet&&<p style={{ fontSize:12,color:cobaltA(0.65),lineHeight:1.7,fontFamily:F.body,marginBottom:16 }}>{detailJob.snippet}</p>}
            {detailJob.url&&<a href={detailJob.url} target="_blank" rel="noopener noreferrer" style={{ display:"block",fontFamily:F.mono,fontSize:9,fontWeight:700,letterSpacing:"0.08em",padding:"9px 14px",background:B.cobalt,color:B.banana,borderRadius:8,textDecoration:"none",marginBottom:18,textAlign:"center" }}>↗ VIEW POSTING</a>}
            {detailLoading&&<div style={{ textAlign:"center",padding:"20px 0",fontFamily:F.mono,fontSize:10,color:cobaltA(0.4),display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}><Spinner/>Loading...</div>}
            {detailData&&(
              <div>
                {detailData.summary&&<p style={{ fontSize:12,color:B.carbon,lineHeight:1.7,fontFamily:F.body,marginBottom:16,padding:"12px 14px",background:cobaltA(0.03),borderRadius:8,border:`1px solid ${cobaltA(0.07)}` }}>{detailData.summary}</p>}
                {[["SKILLS",detailData.skills],["RESPONSIBILITIES",detailData.responsibilities],["BENEFITS",detailData.benefits]].map(([label,items])=>
                  items?.length?(<div key={label} style={{ marginBottom:14 }}>
                    <div style={{ fontFamily:F.mono,fontSize:8,fontWeight:700,color:cobaltA(0.4),letterSpacing:"0.12em",marginBottom:8 }}>{label}</div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{items.map((item,i)=><Tag key={i} label={item}/>)}</div>
                  </div>):null
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 40px 40px" }}>
        <div style={{ height:1,background:cobaltA(0.08),marginBottom:20 }}/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontFamily:F.mono,fontSize:9,fontWeight:600,color:cobaltA(0.28),letterSpacing:"0.1em" }}>LAST UPDATED · {DATE_LABEL}</span>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <CaechetMark size={14} color={cobaltA(0.18)}/>
            <span style={{ fontFamily:F.mono,fontSize:9,fontWeight:600,letterSpacing:"0.18em",color:cobaltA(0.28) }}>STAY DANGEROUS · BE HUMAN</span>
          </div>
        </div>
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

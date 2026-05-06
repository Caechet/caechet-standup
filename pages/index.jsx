import { useState, useEffect } from 'react';
import Head from 'next/head';

const B = {
  cobalt: '#2048C8',
  banana: '#FCF1B8',
  carbon: '#0B0B0D',
};

const cobaltA = a => `rgba(32,72,200,${a})`;
const bananaA = a => `rgba(252,241,184,${a})`;

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

function renderLine(line, i) {
  const base = { fontFamily: "'Lato', system-ui, sans-serif", margin: 0 };
  if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
  if (line.startsWith('CAECHET STANDUP') || line.startsWith('CÆCHET STANDUP')) {
    return <h1 key={i} style={{ ...base, fontSize: 22, fontWeight: 800, color: B.cobalt, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 24, paddingBottom: 12, borderBottom: `2px solid ${cobaltA(0.12)}` }}>{line}</h1>;
  }
  const sections = ['DEPLOYING TODAY','THIS WEEK','AWAITING CLIENT APPROVAL','BLOCKERS','BRAND STATUS','TODAYS MUST-WINS',"TODAY'S MUST-WINS",'AUTOMATION LOG'];
  if (sections.some(sec => line.toUpperCase().startsWith(sec))) {
    return <h2 key={i} style={{ ...base, fontSize: 11, fontWeight: 800, color: B.cobalt, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 28, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${cobaltA(0.1)}` }}>{line}</h2>;
  }
  if (line.includes('[CRITICAL]')) {
    return <div key={i} style={{ padding: '10px 14px', background: 'rgba(224,51,51,0.06)', borderLeft: '3px solid #E03333', borderRadius: '0 8px 8px 0', marginBottom: 6 }}><p style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.55 }}>{line}</p></div>;
  }
  if (line.includes('[HIGH]')) {
    return <div key={i} style={{ padding: '10px 14px', background: 'rgba(217,119,6,0.06)', borderLeft: '3px solid #D97706', borderRadius: '0 8px 8px 0', marginBottom: 6 }}><p style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.55 }}>{line}</p></div>;
  }
  if (line.includes('[WATCH]')) {
    return <div key={i} style={{ padding: '10px 14px', background: cobaltA(0.04), borderLeft: `3px solid ${B.cobalt}`, borderRadius: '0 8px 8px 0', marginBottom: 6 }}><p style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.55 }}>{line}</p></div>;
  }
  if (line.includes('ACTION NEEDED')) {
    return <div key={i} style={{ padding: '8px 14px', background: 'rgba(224,51,51,0.04)', borderLeft: '3px solid #E03333', borderRadius: '0 8px 8px 0', marginBottom: 5 }}><p style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.55 }}>{line}</p></div>;
  }
  if (line.match(/^[1-9]\./)) {
    const num = line.match(/^([1-9])\./)[1];
    const text = line.replace(/^[1-9]\./, '').trim();
    return (
      <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 16px', background: '#fff', borderRadius: 10, border: `1px solid ${cobaltA(0.1)}`, boxShadow: '0 1px 3px rgba(32,72,200,0.06)', marginBottom: 8, alignItems: 'flex-start' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: B.cobalt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Lato', fontSize: 13, fontWeight: 800, color: B.banana }}>{num}</span>
        </div>
        <p style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.6, paddingTop: 4 }}>{text}</p>
      </div>
    );
  }
  if (line.startsWith('—') || line.startsWith('-')) {
    return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: B.cobalt, flexShrink: 0, marginTop: 6 }} /><p style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.55 }}>{line.replace(/^[—-]\s*/, '')}</p></div>;
  }
  if (line.startsWith('---')) {
    return <div key={i} style={{ height: 1, background: cobaltA(0.1), margin: '16px 0' }} />;
  }
  return <p key={i} style={{ ...base, fontSize: 13, color: B.carbon, lineHeight: 1.65, marginBottom: 4 }}>{line}</p>;
}

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Standup() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStandup(isRefresh) {
    if (typeof window === 'undefined') return;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/standup');
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Standup not yet available');
        setData(null);
      } else {
        setData(await res.json());
        setError(null);
      }
    } catch (e) {
      setError('Could not load standup.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetchStandup(false);
    const interval = setInterval(() => fetchStandup(true), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const lines = data && data.text ? data.text.split('\n') : [];

  return (
    <>
      <Head>
        <title>CAECHET Standup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;800;900&family=Archivo:wght@600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ fontFamily: "'Lato', system-ui, sans-serif", background: '#fff', minHeight: '100vh', color: B.carbon }}>
        <div style={{ background: B.cobalt }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 40px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CaechetMark size={44} color={B.banana} />
                <div>
                  <div style={{ fontFamily: "'Archivo', system-ui", fontWeight: 700, fontSize: 28, letterSpacing: '-0.035em', color: B.banana, lineHeight: 1 }}>caechet</div>
                  <div style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 600, color: bananaA(0.65), letterSpacing: '0.18em', marginTop: 5 }}>DAILY STANDUP · {todayLabel}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {data && data.date && <span style={{ fontFamily: 'Lato', fontSize: 10, color: bananaA(0.5), letterSpacing: '0.1em' }}>{refreshing ? 'REFRESHING...' : 'UPDATED ' + formatRelativeTime(data.date)}</span>}
                <button onClick={() => fetchStandup(true)} disabled={refreshing} style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '8px 16px', background: 'transparent', color: B.banana, border: '1px solid rgba(252,241,184,0.35)', borderRadius: 6, cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? 0.5 : 1 }}>REFRESH</button>
              </div>
            </div>
            <div style={{ marginTop: 16, fontFamily: 'Lato', fontSize: 9, fontWeight: 600, letterSpacing: '0.26em', color: bananaA(0.45) }}>STAY DANGEROUS · BE HUMAN</div>
          </div>
        </div>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 40px 80px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 16 }}>
              <CaechetMark size={40} color={cobaltA(0.15)} />
              <p style={{ fontFamily: 'Lato', fontSize: 13, color: cobaltA(0.4), letterSpacing: '0.1em' }}>LOADING STANDUP...</p>
            </div>
          )}
          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 16 }}>
              <CaechetMark size={40} color={cobaltA(0.12)} />
              <p style={{ fontFamily: 'Lato', fontSize: 16, fontWeight: 700, color: cobaltA(0.4), letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Not Yet Available</p>
              <p style={{ fontFamily: 'Lato', fontSize: 13, color: cobaltA(0.35), textAlign: 'center', maxWidth: 360, margin: 0, lineHeight: 1.6 }}>Make runs daily at 9:00 AM ET.</p>
            </div>
          )}
          {!loading && data && (
            <div>{lines.map((line, i) => renderLine(line, i))}</div>
          )}
        </div>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 40px 40px', borderTop: '1px solid rgba(32,72,200,0.08)' }}>
          <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 600, color: cobaltA(0.3), letterSpacing: '0.1em' }}>AUTO-REFRESHES EVERY 10 MIN · POWERED BY MAKE + CLAUDE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CaechetMark size={14} color={cobaltA(0.25)} />
              <span style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: cobaltA(0.3) }}>STAY DANGEROUS · BE HUMAN</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import Head from 'next/head';

const B = {
  cobalt: '#2048C8',
  cobaltDark: '#0F2F8C',
  cobaltBright: '#4A74F5',
  banana: '#FCF1B8',
  carbon: '#0B0B0D',
  snow: '#FAF9F6',
  cream: '#F2EAD8',
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

function BlockRenderer({ block }) {
  const base = {
    fontFamily: "'Lato', system-ui, sans-serif",
    color: B.carbon,
    lineHeight: 1.65,
  };

  switch (block.type) {
    case 'h1':
      return (
        <h1 style={{ ...base, fontSize: 22, fontWeight: 800, color: B.cobalt, letterSpacing: '0.02em', textTransform: 'uppercase', margin: '28px 0 10px', borderBottom: `2px solid ${cobaltA(0.12)}`, paddingBottom: 8 }}>
          {block.text}
        </h1>
      );
    case 'h2':
      return (
        <h2 style={{ ...base, fontSize: 14, fontWeight: 800, color: B.cobalt, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '22px 0 8px' }}>
          {block.text}
        </h2>
      );
    case 'h3':
      return (
        <h3 style={{ ...base, fontSize: 13, fontWeight: 700, color: cobaltA(0.7), letterSpacing: '0.06em', textTransform: 'uppercase', margin: '16px 0 6px' }}>
          {block.text}
        </h3>
      );
    case 'p':
      if (block.text.includes('ACTION NEEDED')) {
        return (
          <p style={{ ...base, fontSize: 13, margin: '6px 0', padding: '8px 14px', background: 'rgba(224,51,51,0.06)', borderLeft: '3px solid #E03333', borderRadius: '0 6px 6px 0' }}>
            {block.text}
          </p>
        );
      }
      if (block.text.startsWith('[CRITICAL]')) {
        return (
          <p style={{ ...base, fontSize: 13, margin: '5px 0', padding: '8px 14px', background: 'rgba(224,51,51,0.06)', borderLeft: '3px solid #E03333', borderRadius: '0 6px 6px 0' }}>
            {block.text}
          </p>
        );
      }
      if (block.text.startsWith('[HIGH]')) {
        return (
          <p style={{ ...base, fontSize: 13, margin: '5px 0', padding: '8px 14px', background: 'rgba(217,119,6,0.06)', borderLeft: '3px solid #D97706', borderRadius: '0 6px 6px 0' }}>
            {block.text}
          </p>
        );
      }
      if (block.text.startsWith('[WATCH]')) {
        return (
          <p style={{ ...base, fontSize: 13, margin: '5px 0', padding: '8px 14px', background: cobaltA(0.05), borderLeft: `3px solid ${B.cobalt}`, borderRadius: '0 6px 6px 0' }}>
            {block.text}
          </p>
        );
      }
      return <p style={{ ...base, fontSize: 13, margin: '5px 0' }}>{block.text}</p>;
    case 'bullet':
      return (
        <div style={{ display: 'flex', gap: 10, margin: '4px 0', alignItems: 'flex-start' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: B.cobalt, flexShrink: 0, marginTop: 6 }} />
          <p style={{ ...base, fontSize: 13, margin: 0 }}>{block.text}</p>
        </div>
      );
    case 'num':
      return (
        <div style={{ display: 'flex', gap: 10, margin: '4px 0', alignItems: 'flex-start' }}>
          <p style={{ ...base, fontSize: 13, margin: 0, color: B.cobalt, fontWeight: 700, minWidth: 16 }}>→</p>
          <p style={{ ...base, fontSize: 13, margin: 0 }}>{block.text}</p>
        </div>
      );
    case 'divider':
      return <div style={{ height: 1, background: cobaltA(0.1), margin: '20px 0' }} />;
    case 'quote':
    case 'callout':
      return (
        <div style={{ padding: '10px 16px', background: cobaltA(0.04), borderLeft: `3px solid ${cobaltA(0.3)}`, borderRadius: '0 8px 8px 0', margin: '8px 0' }}>
          <p style={{ ...base, fontSize: 13, margin: 0, fontStyle: 'italic' }}>{block.text}</p>
        </div>
      );
    default:
      return null;
  }
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
  const [lastFetch, setLastFetch] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStandup(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/standup');
      if (!res.ok) {
        const err = await res.json();
        setError(err.message || 'Standup not yet available');
        setData(null);
      } else {
        const json = await res.json();
        setData(json);
        setError(null);
      }
      setLastFetch(new Date());
    } catch (e) {
      setError('Could not connect to Notion. Check your integration token.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchStandup();
    // Auto-refresh every 10 minutes
    const interval = setInterval(() => fetchStandup(true), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).toUpperCase();

  return (
    <>
      <Head>
        <title>CÆCHET Standup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;800;900&family=Archivo:wght@600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily: "'Lato', system-ui, sans-serif", background: '#fff', minHeight: '100vh', color: B.carbon }}>

        {/* Header */}
        <div style={{ background: B.cobalt, padding: 0 }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 40px 20px' }}>

            {/* Alert bar */}
            {data && !data.isToday && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(217,119,6,0.2)', border: `1px solid rgba(217,119,6,0.4)`, borderRadius: 8, padding: '9px 16px', marginBottom: 20 }}>
                <span style={{ fontFamily: 'Lato', fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.1em' }}>NOTE</span>
                <span style={{ fontSize: 12, color: bananaA(0.8) }}>Showing most recent standup — today's has not been generated yet. Check back after 9am ET.</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CaechetMark size={44} color={B.banana} />
                <div>
                  <div style={{ fontFamily: "'Archivo', system-ui", fontWeight: 700, fontSize: 28, letterSpacing: '-0.035em', color: B.banana, lineHeight: 1 }}>
                    cæchet<span style={{ fontSize: 28 * 0.22, marginLeft: '0.05em', verticalAlign: 'top', marginTop: '0.18em', display: 'inline-block', fontWeight: 700 }}>®</span>
                  </div>
                  <div style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 600, color: bananaA(0.65), letterSpacing: '0.18em', marginTop: 5 }}>
                    DAILY STANDUP · {todayLabel}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {lastFetch && (
                  <span style={{ fontFamily: 'Lato', fontSize: 10, color: bananaA(0.5), letterSpacing: '0.1em' }}>
                    {refreshing ? 'REFRESHING...' : `UPDATED ${formatRelativeTime(lastFetch)}`}
                  </span>
                )}
                <button
                  onClick={() => fetchStandup(true)}
                  disabled={refreshing}
                  style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '8px 16px', background: 'transparent', color: B.banana, border: `1px solid ${bananaA(0.35)}`, borderRadius: 6, cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? 0.5 : 1 }}
                >
                  ↺ REFRESH
                </button>
              </div>
            </div>

            <div style={{ marginTop: 16, fontFamily: 'Lato', fontSize: 9, fontWeight: 600, letterSpacing: '0.26em', color: bananaA(0.45) }}>
              STAY DANGEROUS · BE HUMAN
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 40px 80px' }}>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
              <CaechetMark size={40} color={cobaltA(0.15)} />
              <p style={{ fontFamily: 'Lato', fontSize: 13, color: cobaltA(0.4), letterSpacing: '0.1em' }}>LOADING STANDUP...</p>
            </div>
          )}

          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
              <CaechetMark size={40} color={cobaltA(0.12)} />
              <p style={{ fontFamily: 'Lato', fontSize: 16, fontWeight: 700, color: cobaltA(0.4), letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Not Yet Available</p>
              <p style={{ fontFamily: 'Lato', fontSize: 13, color: cobaltA(0.35), textAlign: 'center', maxWidth: 360, margin: 0, lineHeight: 1.6 }}>{error}</p>
              <p style={{ fontFamily: 'Lato', fontSize: 11, color: cobaltA(0.25), letterSpacing: '0.1em' }}>Make runs daily at 9:00 AM ET</p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Page title */}
              <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${cobaltA(0.08)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h1 style={{ fontFamily: 'Lato', fontSize: 20, fontWeight: 800, color: B.cobalt, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                    {data.title}
                  </h1>
                  {data.lastEdited && (
                    <p style={{ fontFamily: 'Lato', fontSize: 11, color: cobaltA(0.35), letterSpacing: '0.08em', margin: '4px 0 0' }}>
                      NOTION LAST UPDATED · {new Date(data.lastEdited).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <a
                  href={`https://notion.so/${data.pageId?.replace(/-/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '7px 14px', background: cobaltA(0.06), color: B.cobalt, border: `1px solid ${cobaltA(0.2)}`, borderRadius: 6, textDecoration: 'none' }}
                >
                  OPEN IN NOTION ↗
                </a>
              </div>

              {/* Content */}
              <div>
                {data.blocks.map((block, i) => (
                  <BlockRenderer key={i} block={block} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 40px 40px', borderTop: `1px solid ${cobaltA(0.08)}` }}>
          <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontFamily: 'Lato', fontSize: 10, fontWeight: 600, color: cobaltA(0.3), letterSpacing: '0.1em' }}>
              POPULATED FROM NOTION WORKSPACE · AUTO-REFRESHES EVERY 10 MIN
            </span>
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

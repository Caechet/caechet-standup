// pages/index.jsx
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function IndexPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [stats, setStats] = useState({ deploys: 0, talent: 0 });

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/standup").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/job-results").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([standup, jobs]) => {
      const deploys = standup?.data?.weekly?.filter(w => w.s === "deploy").length || 0;
      const talent = jobs?.jobs?.length || 0;
      setStats({ deploys, talent });
    });
  }, []);

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric"
  }).toUpperCase();

  return (
    <div style={{ fontFamily: "'Lato',system-ui,sans-serif", background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", color: "#fff" }}>
      <Head>
        <title>CAECHET</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800;900&family=Lato:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } a { text-decoration: none; } .card:hover { transform: translateY(-3px); }`}</style>
      </Head>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 40px" }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", color: "#FCF1B8" }}>
          caechet<sup style={{ fontSize: 9, verticalAlign: "super" }}>®</sup>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.2)" }}>{date}</div>
      </div>

      <div style={{ padding: "32px 40px 36px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(252,241,184,0.4)", marginBottom: 10 }}>INDEX</div>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 50, letterSpacing: "-0.04em", lineHeight: 1, color: "#fff", marginBottom: 8 }}>
          {greeting},<br />team.
        </div>

      </div>

      <div style={{ padding: "52px 40px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", fontFamily: "'Archivo',sans-serif" }}>Where do you<br/>want to go?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          <Link href="/standup" className="card" style={{ background: "#FCF1B8", borderRadius: 14, padding: "24px 26px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 138, transition: "transform 0.2s" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(32,72,200,0.45)", marginBottom: 6 }}>Daily</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#2048C8" }}>Standup</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", background: "rgba(32,72,200,0.07)", color: "rgba(32,72,200,0.45)", border: "1px solid rgba(32,72,200,0.1)" }}>LIVE FROM NOTION</span>
              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5, color: "#2048C8" }}>OPEN <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1L6 5.5L1 10" stroke="#2048C8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
          </Link>

          <Link href="/jobs" className="card" style={{ background: "#ffffff", borderRadius: 14, padding: "24px 26px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 138, transition: "transform 0.2s" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(32,72,200,0.45)", marginBottom: 6 }}>Sales Pipeline</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#2048C8" }}>Talent Radar</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", background: "rgba(32,72,200,0.07)", color: "rgba(32,72,200,0.45)", border: "1px solid rgba(32,72,200,0.1)" }}>AUTO · 6H</span>
              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5, color: "#2048C8" }}>OPEN <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1L6 5.5L1 10" stroke="#2048C8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
          </Link>

        </div>
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "18px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.12)" }}>STAY DANGEROUS · BE HUMAN</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.12)" }}>MADE IN MIAMI · CAECHET 2026</span>
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

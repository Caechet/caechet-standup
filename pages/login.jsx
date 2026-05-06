import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

const B = {
  cobalt: "#2048C8",
  banana: "#FCF1B8",
  carbon: "#0B0B0D",
};
const cobaltA = a => `rgba(32,72,200,${a})`;
const bananaA = a => `rgba(252,241,184,${a})`;
const F = { ui: "'Archivo',system-ui,sans-serif", body: "'Lato',system-ui,sans-serif", mono: "'Lato',system-ui,sans-serif" };

function CaechetMark({ size = 40, color = B.banana }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <g fill={color}>
        <rect x="56.54" y="-1.46" width="50.91" height="50.91" transform="rotate(45 92 64)" />
        <rect x="28.54" y="22.54" width="50.91" height="50.91" transform="rotate(45 64 88)" />
        <rect x="28.54" y="46.54" width="50.91" height="50.91" transform="rotate(45 64 112)" />
        <rect x="56.54" y="70.54" width="50.91" height="50.91" transform="rotate(45 92 136)" />
      </g>
    </svg>
  );
}

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        setError("Incorrect password. Try again.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>CÆCHET Standup — Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Lato:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>{`*{box-sizing:border-box;margin:0;padding:0} input:focus{outline:none;}`}</style>
      </Head>
      <div style={{ minHeight: "100vh", background: B.cobalt, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        
        {/* Card */}
        <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          
          {/* Header */}
          <div style={{ background: B.cobalt, padding: "32px 36px 28px", display: "flex", alignItems: "center", gap: 16 }}>
            <CaechetMark size={40} color={B.banana} />
            <div>
              <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 24, letterSpacing: "-0.03em", color: B.banana, lineHeight: 1 }}>
                cæchet<span style={{ fontSize: 5, verticalAlign: "super", marginLeft: 2 }}>®</span>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: bananaA(0.6), letterSpacing: "0.18em", marginTop: 5 }}>DAILY STANDUP</div>
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: "32px 36px 36px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 18, color: B.carbon, marginBottom: 6 }}>Team Access</div>
              <div style={{ fontFamily: F.body, fontSize: 13, color: cobaltA(0.5), lineHeight: 1.5 }}>Enter the team password to access today's standup.</div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: B.cobalt, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter team password"
                  autoFocus
                  style={{
                    width: "100%", padding: "12px 16px",
                    border: `1px solid ${error ? "rgba(224,51,51,0.5)" : cobaltA(0.2)}`,
                    borderRadius: 8, fontSize: 14, fontFamily: F.body,
                    color: B.carbon, background: "#FAFBFF",
                    transition: "border-color 0.15s",
                  }}
                />
                {error && (
                  <div style={{ fontFamily: F.body, fontSize: 12, color: "#E03333", marginTop: 8 }}>{error}</div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password.trim()}
                style={{
                  width: "100%", padding: "13px",
                  background: loading || !password.trim() ? cobaltA(0.4) : B.cobalt,
                  color: B.banana, border: "none", borderRadius: 8,
                  fontFamily: F.mono, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.12em", cursor: loading || !password.trim() ? "default" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {loading ? "CHECKING..." : "ENTER STANDUP →"}
              </button>
            </form>

            <div style={{ marginTop: 24, fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: cobaltA(0.3), letterSpacing: "0.14em", textAlign: "center" }}>
              STAY DANGEROUS · BE HUMAN
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, fontFamily: F.mono, fontSize: 9, fontWeight: 600, color: bananaA(0.35), letterSpacing: "0.16em" }}>
          CÆCHET® RETENTION MARKETING
        </div>
      </div>
    </>
  );
}

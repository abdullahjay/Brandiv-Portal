"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#fca5a5",
          fontSize: 13,
          padding: "10px 14px",
          borderRadius: 10,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 7, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Email address
        </label>
        <div style={{ position: "relative" }}>
          <i className="ti ti-mail" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input
            type="email"
            placeholder="you@brandiv.co"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            style={{
              width: "100%",
              height: 48,
              paddingLeft: 42,
              paddingRight: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(93,79,255,0.8)"; e.target.style.background = "rgba(93,79,255,0.08)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 7, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Password
        </label>
        <div style={{ position: "relative" }}>
          <i className="ti ti-lock" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input
            type={showPass ? "text" : "password"}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 48,
              paddingLeft: 42,
              paddingRight: 46,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(93,79,255,0.8)"; e.target.style.background = "rgba(93,79,255,0.08)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, fontSize: 15, lineHeight: 1 }}
          >
            <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`} />
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          height: 50,
          background: loading ? "rgba(93,79,255,0.4)" : "linear-gradient(135deg, #5d4fff 0%, #2874fc 100%)",
          border: "none",
          borderRadius: 12,
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "opacity 0.2s, transform 0.15s",
          letterSpacing: "0.02em",
          boxShadow: loading ? "none" : "0 8px 32px rgba(93,79,255,0.45)",
        }}
        onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; } }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
      >
        {loading ? (
          <>
            <i className="ti ti-loader-2" style={{ fontSize: 16, animation: "spin 1s linear infinite" }} />
            Signing in…
          </>
        ) : (
          <>
            Sign in to workspace
            <i className="ti ti-arrow-right" style={{ fontSize: 16 }} />
          </>
        )}
      </button>
    </form>
  );
}

const features = [
  { icon: "ti-chart-bar", label: "Financial Overview", desc: "Real-time P&L, cashflow and account balances" },
  { icon: "ti-users", label: "Client & Projects", desc: "Track clients, pipelines and project milestones" },
  { icon: "ti-coin", label: "Distribution Engine", desc: "Automated stakeholder profit distribution" },
];

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.5; }
          50% { transform: translateY(-40px) scale(1.05); opacity: 0.8; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .panel-left { animation: slideInLeft 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
        .panel-right { animation: slideInRight 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
        ::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #0d1142 inset !important;
          -webkit-text-fill-color: #ffffff !important;
        }
        @media (max-width: 768px) {
          .split-layout { flex-direction: column !important; }
          .panel-left { display: none !important; }
          .panel-right { width: 100% !important; min-height: 100vh !important; }
        }
      `}</style>

      <div className="split-layout" style={{
        minHeight: "100vh",
        display: "flex",
        background: "#080c24",
      }}>

        {/* ── LEFT PANEL — Brand ── */}
        <div className="panel-left" style={{
          flex: "0 0 55%",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #020381 0%, #0d1142 45%, #0a0e2e 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
        }}>

          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />

          {/* Orbs */}
          <div style={{ position: "absolute", top: "8%", left: "10%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,79,255,0.18) 0%, transparent 65%)", animation: "floatOrb 9s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "5%", right: "-5%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(40,116,252,0.15) 0%, transparent 65%)", animation: "floatOrb 12s ease-in-out infinite reverse", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "55%", left: "55%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,79,255,0.1) 0%, transparent 65%)", animation: "floatOrb 15s ease-in-out infinite", pointerEvents: "none" }} />

          {/* Top: Logo */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, #5d4fff 0%, #2874fc 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 20px rgba(93,79,255,0.5)",
              }}>
                <i className="ti ti-brand-abstract" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Brandiv Labs</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Internal Portal</div>
              </div>
            </div>
          </div>

          {/* Middle: Headline */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              fontSize: 42,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: 16,
            }}>
              Your business,<br />
              <span style={{
                background: "linear-gradient(90deg, #7c6fff 0%, #4d9fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>fully in view.</span>
            </div>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 360, margin: "0 0 40px" }}>
              Manage clients, track revenue, run distributions, and monitor every financial detail — all in one place.
            </p>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {features.map((f) => (
                <div key={f.icon} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "rgba(93,79,255,0.18)",
                    border: "1px solid rgba(93,79,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className={`ti ${f.icon}`} style={{ fontSize: 17, color: "#8b7fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: copyright */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
              © {new Date().getFullYear()} BRANDIV LABS · ALL RIGHTS RESERVED
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL — Form ── */}
        <div className="panel-right" style={{
          flex: "0 0 45%",
          background: "#0d1142",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
          position: "relative",
        }}>

          {/* Subtle top glow */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 300, height: 1, background: "linear-gradient(90deg, transparent, rgba(93,79,255,0.5), transparent)", pointerEvents: "none" }} />

          <div style={{ width: "100%", maxWidth: 380 }}>

            {/* Form header */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em", marginBottom: 8 }}>
                Welcome back
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                Sign in to access your workspace and continue where you left off.
              </div>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
                Need access?{" "}
                <span style={{ color: "rgba(139,127,255,0.7)", cursor: "default" }}>Contact your administrator.</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

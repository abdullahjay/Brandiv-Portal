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

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 7, letterSpacing: "0.03em" }}>
          Email address
        </label>
        <div style={{ position: "relative" }}>
          <i className="ti ti-mail" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
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
              height: 46,
              paddingLeft: 40,
              paddingRight: 14,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(93,79,255,0.7)"; e.target.style.background = "rgba(255,255,255,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 7, letterSpacing: "0.03em" }}>
          Password
        </label>
        <div style={{ position: "relative" }}>
          <i className="ti ti-lock" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
          <input
            type={showPass ? "text" : "password"}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 46,
              paddingLeft: 40,
              paddingRight: 44,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(93,79,255,0.7)"; e.target.style.background = "rgba(255,255,255,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 0, fontSize: 15 }}
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
          height: 48,
          background: loading ? "rgba(93,79,255,0.5)" : "linear-gradient(135deg, #5d4fff 0%, #2874fc 100%)",
          border: "none",
          borderRadius: 10,
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "opacity 0.2s, transform 0.1s",
          letterSpacing: "0.02em",
          boxShadow: loading ? "none" : "0 4px 24px rgba(93,79,255,0.4)",
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        {loading ? (
          <>
            <i className="ti ti-loader-2" style={{ fontSize: 16, animation: "spin 1s linear infinite" }} />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <i className="ti ti-arrow-right" style={{ fontSize: 16 }} />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          50% { transform: translateY(-30px) rotate(180deg); opacity: 0.12; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.5s ease forwards; }
        ::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px rgba(13,17,45,0.95) inset !important;
          -webkit-text-fill-color: #ffffff !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #020381 0%, #0d1142 40%, #0a0e2e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Background floating orbs */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,79,255,0.15) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(40,116,252,0.12) 0%, transparent 70%)", animation: "float 11s ease-in-out infinite reverse" }} />
          <div style={{ position: "absolute", top: "50%", right: "25%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(2,3,129,0.2) 0%, transparent 70%)", animation: "float 14s ease-in-out infinite" }} />

          {/* Grid pattern overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>

        {/* Login card */}
        <div className="login-card" style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>

          {/* Logo / Brand */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #5d4fff 0%, #2874fc 100%)",
              marginBottom: 16,
              boxShadow: "0 8px 24px rgba(93,79,255,0.4)",
            }}>
              <i className="ti ti-brand-abstract" style={{ fontSize: 26, color: "#fff" }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Brandiv Labs
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 5, letterSpacing: "0.01em" }}>
              Sign in to your workspace
            </div>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              Need access? Contact your administrator.
            </span>
          </div>
        </div>

        {/* Bottom brand mark */}
        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em" }}>
            © {new Date().getFullYear()} BRANDIV LABS · INTERNAL PORTAL
          </span>
        </div>
      </div>
    </>
  );
}

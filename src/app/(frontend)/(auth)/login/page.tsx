"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--bg1)",
          border: "0.5px solid var(--b3)",
          borderRadius: "var(--rl)",
          width: "100%",
          maxWidth: 380,
          padding: 32,
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--t1)" }}>
            Brandiv Labs
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 4 }}>
            Sign in to your workspace
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "var(--red-bg)",
              color: "var(--red)",
              fontSize: 12,
              padding: "10px 12px",
              borderRadius: "var(--rm)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="frow">
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@brandivlabs.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="frow">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", height: 38, marginTop: 4 }}
          >
            {loading ? (
              <>
                <i className="ti ti-loader-2" style={{ fontSize: 14 }} />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "var(--t3)",
            textAlign: "center",
          }}
        >
          Contact your admin if you need access.
        </div>
      </div>
    </div>
  );
}

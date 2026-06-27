"use client";
import { useState } from "react";

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const API = process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql/";

  async function gql(query: string, variables: Record<string, unknown> = {}) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const j = await r.json();
    if (j.errors?.length) throw new Error(j.errors[0].message);
    return j.data;
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const d = await gql(`mutation L($u:String!,$p:String!){tokenAuth(username:$u,password:$p){token}}`, { u: username, p: password });
      onLogin(d.tokenAuth.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await gql(`mutation R($u:String!,$c:String!){requestOtp(username:$u,purpose:"LOGIN",channel:$c){emailSent smsSent}}`, { u: username, c: channel });
      setInfo(`OTP sent via ${channel}. Enter the 6-digit code below.`);
      setOtpStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally { setLoading(false); }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const d = await gql(`mutation V($u:String!,$c:String!){verifyOtpLogin(username:$u,code:$c){token}}`, { u: username, c: otpCode });
      onLogin(d.verifyOtpLogin.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--bg)", color: "var(--fg)", fontSize: 15, boxSizing: "border-box",
  };
  const btnStyle: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: 8, border: "none",
    background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 0", border: "none", background: "none",
    cursor: "pointer", fontWeight: active ? 700 : 400,
    color: active ? "var(--primary)" : "var(--muted)",
    borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
    fontSize: 14,
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        background: "var(--paper)", borderRadius: 16, padding: 40, width: 380,
        boxShadow: "0 4px 32px rgba(0,0,0,0.12)", border: "1px solid var(--border)",
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>GarmentFlow</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 28px", fontSize: 14 }}>Garment ERP — Sign in to continue</p>

        {/* Mode tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
          <button style={tabStyle(mode === "password")} onClick={() => { setMode("password"); setError(""); setInfo(""); }}>Password</button>
          <button style={tabStyle(mode === "otp")} onClick={() => { setMode("otp"); setOtpStep("request"); setError(""); setInfo(""); }}>OTP Login</button>
        </div>

        {error && <div style={{ background: "#ff000020", color: "#f44", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {info && <div style={{ background: "#00800020", color: "#080", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{info}</div>}

        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input style={inputStyle} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
            <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button style={btnStyle} disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          </form>
        )}

        {mode === "otp" && otpStep === "request" && (
          <form onSubmit={handleRequestOTP} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input style={inputStyle} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
            <div style={{ display: "flex", gap: 8 }}>
              {(["EMAIL", "SMS"] as const).map(c => (
                <button key={c} type="button" onClick={() => setChannel(c)} style={{
                  flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 14,
                  border: channel === c ? "2px solid var(--primary)" : "1px solid var(--border)",
                  background: channel === c ? "var(--primary)20" : "var(--bg)",
                  color: channel === c ? "var(--primary)" : "var(--fg)", fontWeight: channel === c ? 700 : 400,
                }}>{c}</button>
              ))}
            </div>
            <button style={btnStyle} disabled={loading}>{loading ? "Sending OTP…" : "Send OTP"}</button>
          </form>
        )}

        {mode === "otp" && otpStep === "verify" && (
          <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input style={{ ...inputStyle, letterSpacing: 6, fontSize: 22, textAlign: "center" }}
              placeholder="000000" value={otpCode} maxLength={6}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))} required />
            <button style={btnStyle} disabled={loading}>{loading ? "Verifying…" : "Verify & Sign in"}</button>
            <button type="button" style={{ ...btnStyle, background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}
              onClick={() => { setOtpStep("request"); setOtpCode(""); setInfo(""); }}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { graphql } from "@/app/lib/graphql";
import type { AppSettings } from "@/app/types";

export default function Login({
  settings,
  darkMode,
  onToggleDark,
  onAuthenticated,
}: {
  settings: Partial<AppSettings> | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onAuthenticated: (token: string) => void;
}) {
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const appName = settings?.appName || "Wareflow";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    try {
      if (registering) {
        const created = await graphql<{ createUser: { message: string } }>(
          `mutation Register($username: String!, $password: String!) { createUser(username: $username, password: $password) { message } }`,
          { username, password },
        );
        if (!/success/i.test(created.createUser.message)) throw new Error(created.createUser.message);
      }
      const result = await graphql<{ tokenAuth: { token: string } }>(
        `mutation Login($username: String!, $password: String!) { tokenAuth(username: $username, password: $password) { token } }`,
        { username, password },
      );
      onAuthenticated(result.tokenAuth.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand light">
          {settings?.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={settings.logoUrl} alt="logo" className="brand-logo" />
            : <div className="brand-mark">{appName.slice(0, 1).toUpperCase()}</div>}
          <div>
            <strong>{appName}</strong>
            <span>{settings?.appSubtitle || "Inventory OS"}</span>
          </div>
        </div>
        <div className="story-copy">
          <p className="eyebrow">Clarity from dock to dispatch</p>
          <h1>Know what you have.<br />Know where it went.</h1>
          <p>One calm workspace for stock, vendors, returns, and damaged goods — built for India.</p>
        </div>
        <div className="story-metric">
          <span>LIVE</span>
          <p>Every movement leaves a traceable inventory record.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">Welcome to {appName}</p>
          <h2>{registering ? "Create your workspace" : "Sign in to continue"}</h2>
          <p className="muted">{registering ? "Set up your warehouse operator account." : "Use your warehouse operator credentials."}</p>
          {error && <div className="form-error">{error}</div>}
          <label>Username<input name="username" required autoComplete="username" placeholder="e.g. sathish" /></label>
          <label>Password
            <input name="password" required minLength={8} type="password"
              autoComplete={registering ? "new-password" : "current-password"} placeholder="••••••••" />
          </label>
          <button className="primary-button login-button" disabled={busy}>
            {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
          </button>
          <button type="button" className="text-button" onClick={() => { setRegistering(!registering); setError(""); }}>
            {registering ? "Already have an account? Sign in" : "First time here? Create an account"}
          </button>
          <button
            type="button"
            style={{ marginTop: 16, width: "100%", border: "1px solid #ccc", borderRadius: 8, padding: "10px", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
            onClick={onToggleDark}
          >
            {darkMode ? "☀ Switch to light mode" : "☾ Switch to dark mode"}
          </button>
        </form>
      </section>
    </div>
  );
}

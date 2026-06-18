"use client";

import { useState } from "react";
import { applyBrandColors } from "@/app/lib/theme";
import type { AppSettings } from "@/app/types";

export default function Settings({
  current,
  onSave,
}: {
  current: AppSettings;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [appName, setAppName] = useState(current.appName);
  const [appSubtitle, setAppSubtitle] = useState(current.appSubtitle);
  const [logoUrl, setLogoUrl] = useState(current.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(current.primaryColor || "#173a2c");
  const [accentColor, setAccentColor] = useState(current.accentColor || "#d4932f");
  const [defaultDarkMode, setDefaultDarkMode] = useState(current.defaultDarkMode);
  const [alertEmail, setAlertEmail] = useState(current.alertEmail || "");
  const [whatsappEnabled, setWhatsappEnabled] = useState(current.whatsappEnabled);
  const [whatsappAccountSid, setWhatsappAccountSid] = useState("");
  const [whatsappAuthToken, setWhatsappAuthToken] = useState("");
  const [whatsappFromNumber, setWhatsappFromNumber] = useState(current.whatsappFromNumber || "");

  const handleSave = async () => {
    setBusy(true); setSaved(false); setError("");
    try {
      await onSave({
        appName, appSubtitle, logoUrl: logoUrl || null,
        primaryColor, accentColor, defaultDarkMode,
        alertEmail: alertEmail || null,
        whatsappEnabled,
        whatsappAccountSid: whatsappAccountSid || null,
        whatsappAuthToken: whatsappAuthToken || null,
        whatsappFromNumber: whatsappFromNumber || null,
      });
      applyBrandColors({ primaryColor, accentColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page">
      {error && <div className="form-error">{error}</div>}
      {saved && (
        <div className="form-error" style={{ background: "#e4efe7", borderColor: "#aaceb5", color: "#397153" }}>
          Settings saved successfully.
        </div>
      )}

      <div className="settings-section">
        <div className="settings-section-head">
          <div><h3>Branding</h3><p>Customize your app name, logo, and colours. Changes apply live.</p></div>
        </div>
        <div className="settings-body">
          <div className="settings-grid">
            <label>App name<input value={appName} onChange={e => setAppName(e.target.value)} placeholder="Wareflow" /></label>
            <label>Subtitle / tagline<input value={appSubtitle} onChange={e => setAppSubtitle(e.target.value)} placeholder="Inventory OS" /></label>
          </div>
          <label>
            Logo URL <small style={{ fontWeight: 400, color: "var(--muted)" }}>(paste an image URL or base64 data URI)</small>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
          </label>
          {logoUrl && (
            <div style={{ marginTop: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo preview" className="logo-preview"
                onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          )}
          <div className="settings-grid" style={{ marginTop: 8 }}>
            <label>Primary colour (sidebar, buttons)
              <div className="color-row">
                <input type="color" value={primaryColor} onChange={e => {
                  setPrimaryColor(e.target.value);
                  document.documentElement.style.setProperty("--primary", e.target.value);
                }} />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#173a2c" style={{ flex: 1 }} />
                <div className="color-preview" style={{ background: primaryColor }} />
              </div>
            </label>
            <label>Accent colour (badges, highlights)
              <div className="color-row">
                <input type="color" value={accentColor} onChange={e => {
                  setAccentColor(e.target.value);
                  document.documentElement.style.setProperty("--accent", e.target.value);
                }} />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="#d4932f" style={{ flex: 1 }} />
                <div className="color-preview" style={{ background: accentColor }} />
              </div>
            </label>
          </div>
          <div className="toggle-row" style={{ marginTop: 16 }}>
            <div>
              <strong>Default dark mode</strong>
              <span>New users who haven&apos;t toggled yet will start in dark mode</span>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={defaultDarkMode} onChange={e => setDefaultDarkMode(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-head">
          <div><h3>Email alerts</h3><p>Where to send low-stock and system notifications</p></div>
        </div>
        <div className="settings-body">
          <label>Alert email address
            <input type="email" value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
              placeholder="inventory@yourcompany.com" />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-head">
          <div>
            <h3>WhatsApp notifications (Twilio)</h3>
            <p>Send low-stock alerts and replenishment requests via WhatsApp Business API</p>
          </div>
        </div>
        <div className="settings-body">
          <div className="toggle-row">
            <div><strong>Enable WhatsApp</strong><span>Send messages via Twilio WhatsApp API</span></div>
            <label className="toggle">
              <input type="checkbox" checked={whatsappEnabled} onChange={e => setWhatsappEnabled(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          {whatsappEnabled && (
            <>
              <div className="settings-grid">
                <label>Twilio Account SID
                  <input value={whatsappAccountSid} onChange={e => setWhatsappAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxx…" type="password" autoComplete="off" />
                </label>
                <label>Twilio Auth Token
                  <input value={whatsappAuthToken} onChange={e => setWhatsappAuthToken(e.target.value)}
                    placeholder="Your auth token" type="password" autoComplete="off" />
                </label>
              </div>
              <label>From WhatsApp number
                <input value={whatsappFromNumber} onChange={e => setWhatsappFromNumber(e.target.value)}
                  placeholder="+14155238886" />
              </label>
              <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
                Employees with a phone number starting with &quot;+&quot; receive WhatsApp alerts.
                Managers and Admins get low-stock alerts; vendor contacts get replenishment requests.
              </p>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="primary-button" style={{ padding: "11px 28px" }} onClick={handleSave} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";

interface SettingsData {
  id?: string
  appName?: string; appSubtitle?: string; companyName?: string; currencySymbol?: string; taxPercent?: number
  smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPassword?: string; smtpFromEmail?: string; emailEnabled?: boolean
  twilioAccountSid?: string; twilioAuthToken?: string; twilioFromNumber?: string; smsEnabled?: boolean
  otpExpiryMinutes?: number; allowOtpLogin?: boolean
}

interface Props { settings: SettingsData; isSuperAdmin: boolean; onMutate: (q: string, v: Record<string, unknown>) => Promise<void> }

export default function Settings({ settings, isSuperAdmin, onMutate }: Props) {
  const [form, setForm] = useState<SettingsData>({ ...settings });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (!isSuperAdmin) return (
    <div style={{ padding: 24, color: "var(--muted)", textAlign: "center", paddingTop: 80 }}>Only Super Administrators can manage system settings.</div>
  );

  async function save() {
    setLoading(true); setSaved(false); setError("");
    try {
      await onMutate(
        `mutation U(
          $appName:String,$appSubtitle:String,$companyName:String,$currencySymbol:String,$taxPercent:Float,
          $smtpHost:String,$smtpPort:Int,$smtpUser:String,$smtpPassword:String,$smtpFromEmail:String,$emailEnabled:Boolean,
          $twilioSid:String,$twilioToken:String,$twilioFrom:String,$smsEnabled:Boolean,
          $otpExpiry:Int,$allowOtp:Boolean
        ){updateSystemSettings(
          appName:$appName,appSubtitle:$appSubtitle,companyName:$companyName,currencySymbol:$currencySymbol,taxPercent:$taxPercent,
          smtpHost:$smtpHost,smtpPort:$smtpPort,smtpUser:$smtpUser,smtpPassword:$smtpPassword,smtpFromEmail:$smtpFromEmail,emailEnabled:$emailEnabled,
          twilioAccountSid:$twilioSid,twilioAuthToken:$twilioToken,twilioFromNumber:$twilioFrom,smsEnabled:$smsEnabled,
          otpExpiryMinutes:$otpExpiry,allowOtpLogin:$allowOtp
        ){settings{id}}}`,
        {
          appName: form.appName, appSubtitle: form.appSubtitle,
          companyName: form.companyName, currencySymbol: form.currencySymbol, taxPercent: form.taxPercent ? +form.taxPercent : undefined,
          smtpHost: form.smtpHost, smtpPort: form.smtpPort ? +form.smtpPort : undefined,
          smtpUser: form.smtpUser, smtpPassword: form.smtpPassword || undefined,
          smtpFromEmail: form.smtpFromEmail, emailEnabled: form.emailEnabled,
          twilioSid: form.twilioAccountSid, twilioToken: form.twilioAuthToken,
          twilioFrom: form.twilioFromNumber, smsEnabled: form.smsEnabled,
          otpExpiry: form.otpExpiryMinutes ? +form.otpExpiryMinutes : undefined,
          allowOtp: form.allowOtpLogin,
        }
      );
      setSaved(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setLoading(false); }
  }

  const f = form as Record<string, unknown>;
  const inp = (label: string, field: keyof SettingsData, type = "text") => (
    <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
      {label}
      <input type={type} value={(f[field] as string) || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
    </label>
  );
  const toggle = (label: string, field: keyof SettingsData) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
      <input type="checkbox" checked={!!(f[field])} onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))} />
      {label}
    </label>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>System Settings</h2>
        <button onClick={save} disabled={loading}
          style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
      {saved && <div style={{ background: "#4caf5020", color: "#2e7d32", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>Settings saved successfully.</div>}
      {error && <div style={{ background: "#f4433620", color: "#d32f2f", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      <Section title="App & Company">
        {inp("App Name", "appName")}
        {inp("App Subtitle", "appSubtitle")}
        {inp("Company Name", "companyName")}
        {inp("Currency Symbol", "currencySymbol")}
        {inp("GST / Tax %", "taxPercent", "number")}
        {inp("OTP Expiry (minutes)", "otpExpiryMinutes", "number")}
        <div style={{ gridColumn: "1/-1" }}>{toggle("Allow OTP Login", "allowOtpLogin")}</div>
      </Section>

      <Section title="Email (SMTP)">
        {inp("SMTP Host", "smtpHost")}
        {inp("SMTP Port", "smtpPort", "number")}
        {inp("SMTP Username", "smtpUser")}
        {inp("SMTP Password", "smtpPassword")}
        {inp("From Email", "smtpFromEmail")}
        <div style={{ gridColumn: "1/-1" }}>{toggle("Enable Email OTP", "emailEnabled")}</div>
      </Section>

      <Section title="SMS (Twilio)">
        {inp("Twilio Account SID", "twilioAccountSid")}
        {inp("Twilio Auth Token", "twilioAuthToken")}
        {inp("Twilio From Number", "twilioFromNumber")}
        <div style={{ gridColumn: "1/-1" }}>{toggle("Enable SMS OTP", "smsEnabled")}</div>
      </Section>
    </div>
  );
}

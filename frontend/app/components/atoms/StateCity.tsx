"use client";
import { INDIAN_STATES, CITIES_BY_STATE } from "@/app/lib/india";

const s: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--bg)", color: "var(--fg)", fontSize: 14, width: "100%", boxSizing: "border-box",
};
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13 };
const muted: React.CSSProperties = { color: "var(--muted)", fontWeight: 500 };

interface Props {
  state: string; city: string
  onStateChange: (v: string) => void
  onCityChange: (v: string) => void
}

export default function StateCity({ state, city, onStateChange, onCityChange }: Props) {
  const cities = state ? (CITIES_BY_STATE[state] || []) : [];

  return (
    <>
      <label style={lbl}>
        <span style={muted}>State</span>
        <select value={state} onChange={e => { onStateChange(e.target.value); onCityChange(""); }} style={s}>
          <option value="">Select state…</option>
          {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </label>
      <label style={lbl}>
        <span style={muted}>City</span>
        {/* datalist gives autocomplete suggestions; user can still type a custom city */}
        <input
          list="city-suggestions"
          value={city}
          onChange={e => onCityChange(e.target.value)}
          placeholder={state ? "Type or select city…" : "Select state first"}
          disabled={!state}
          style={{ ...s, opacity: state ? 1 : 0.5 }}
        />
        {cities.length > 0 && (
          <datalist id="city-suggestions">
            {cities.map(c => <option key={c} value={c} />)}
          </datalist>
        )}
      </label>
    </>
  );
}

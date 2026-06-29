"use client";
import { useState } from "react";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];

const I: React.CSSProperties = {
  padding: "10px 13px", borderRadius: 9, border: "1px solid var(--line)",
  background: "var(--input-bg)", color: "var(--ink)", fontSize: 14, width: "100%", outline: "none",
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Extra known sizes (e.g. from DB records) that aren't in the standard list */
  extraOptions?: string[];
  label?: string;
  required?: boolean;
}

export default function SizeSelect({ value, onChange, extraOptions = [], label = "Size", required }: Props) {
  const isCustom = value !== "" && !STANDARD_SIZES.includes(value) && !extraOptions.includes(value);
  const [custom, setCustom] = useState(isCustom ? value : "");

  const allOptions = [
    ...STANDARD_SIZES,
    ...extraOptions.filter(e => !STANDARD_SIZES.includes(e)),
  ];

  function handleSelect(v: string) {
    if (v === "__custom__") {
      onChange(custom);
    } else {
      setCustom("");
      onChange(v);
    }
  }

  const selectValue = isCustom ? "__custom__" : value;

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.4, textTransform: "uppercase" }}>
      {label}{required && " *"}
      <select value={selectValue} onChange={e => handleSelect(e.target.value)} style={I}>
        <option value="">— Select size —</option>
        {allOptions.map(s => <option key={s} value={s}>{s}</option>)}
        <option value="__custom__">Custom…</option>
      </select>
      {(selectValue === "__custom__" || isCustom) && (
        <input
          value={custom}
          onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
          placeholder="Enter custom size (e.g. 42, 44, Petite)"
          style={{ ...I, marginTop: 4 }}
        />
      )}
    </label>
  );
}

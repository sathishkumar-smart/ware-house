"use client";

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: number
  style?: React.CSSProperties
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "linear-gradient(90deg, var(--line) 25%, var(--canvas) 50%, var(--line) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
      <Skeleton height={18} width="55%" style={{ marginBottom: 14 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={13} width={i % 2 === 0 ? "90%" : "70%"} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: "var(--canvas)", padding: "10px 14px", display: "flex", gap: 16, borderBottom: "1px solid var(--line)" }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} height={12} width={60 + i * 20} />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: "12px 14px", display: "flex", gap: 16, borderBottom: "1px solid var(--line)", alignItems: "center" }}>
          {Array.from({ length: cols }).map((_, j) => <Skeleton key={j} height={14} width={50 + j * 25} />)}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Skeleton height={24} width={200} />
        <Skeleton height={36} width={140} borderRadius={9} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Skeleton height={36} width="60%" borderRadius={8} />
        <Skeleton height={36} width={180} borderRadius={8} />
      </div>
      <SkeletonTable />
    </div>
  );
}

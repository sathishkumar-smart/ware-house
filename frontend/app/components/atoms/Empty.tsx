export default function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? "empty compact" : "empty"}>
      <span>◇</span>
      <p>{text}</p>
    </div>
  );
}

interface ProgressBarProps {
  value: number; // 0–100
}

export default function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="com-bar">
      <div className="com-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

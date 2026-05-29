"use client";

import { useState, useRef, useEffect } from "react";

interface PeriodSelectProps {
  value: string;
  onChange: (v: string) => void;
  includeAll?: boolean;
  allLabel?: string;
  monthsBack?: number;  // kept for API compat, unused in calendar UI
  style?: React.CSSProperties;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatLabel(value: string): string {
  if (!value) return "All periods";
  const [yr, mo] = value.split("-");
  const d = new Date(parseInt(yr), parseInt(mo) - 1, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

export default function PeriodSelect({
  value,
  onChange,
  includeAll = false,
  allLabel = "All periods",
  style,
}: PeriodSelectProps) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return now.getFullYear();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Sync viewYear when value changes externally
  useEffect(() => {
    if (value) setViewYear(parseInt(value.split("-")[0]));
  }, [value]);

  function pick(monthIdx: number) {
    const v = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    onChange(v);
    setOpen(false);
  }

  const curYear = now.getFullYear();
  const curMonthIdx = now.getMonth();

  const buttonLabel = value ? formatLabel(value) : (includeAll ? allLabel : formatLabel(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  ));

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 32,
          padding: "0 10px",
          border: `0.5px solid ${open ? "var(--blue)" : "var(--b2)"}`,
          borderRadius: "var(--rm)",
          background: "var(--bg1)",
          fontSize: 12,
          color: "var(--t1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          outline: "none",
          transition: "border-color .1s",
        }}
      >
        <i className="ti ti-calendar" style={{ fontSize: 13, color: open ? "var(--blue)" : "var(--t3)" }} />
        <span>{buttonLabel}</span>
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 11, color: "var(--t3)", marginLeft: 2 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 1000,
            background: "var(--bg1)",
            border: "0.5px solid var(--b3)",
            borderRadius: "var(--rl)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "12px",
            width: 216,
          }}
        >
          {/* Year navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid var(--b3)" }}>
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              style={{ width: 28, height: 28, border: "0.5px solid var(--b3)", background: "var(--bg2)", cursor: "pointer", borderRadius: 6, color: "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= curYear}
              style={{ width: 28, height: 28, border: "0.5px solid var(--b3)", background: "var(--bg2)", cursor: viewYear >= curYear ? "not-allowed" : "pointer", borderRadius: 6, color: viewYear >= curYear ? "var(--t3)" : "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center", opacity: viewYear >= curYear ? 0.4 : 1 }}
            >
              <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
            </button>
          </div>

          {/* Month grid: 4 cols × 3 rows */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {MONTHS_SHORT.map((m, i) => {
              const isFuture = viewYear > curYear || (viewYear === curYear && i > curMonthIdx);
              const selectedVal = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
              const isSelected = value === selectedVal;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={isFuture}
                  onClick={() => !isFuture && pick(i)}
                  style={{
                    height: 36,
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: isFuture ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    background: isSelected ? "var(--blue)" : "transparent",
                    color: isFuture ? "var(--t3)" : isSelected ? "#fff" : "var(--t1)",
                    fontWeight: isSelected ? 600 : 400,
                    transition: "background .1s, color .1s",
                  }}
                  onMouseEnter={(e) => { if (!isFuture && !isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg2)"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* All periods option */}
          {includeAll && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              style={{
                width: "100%",
                marginTop: 10,
                height: 30,
                border: `0.5px solid ${!value ? "var(--blue)" : "var(--b3)"}`,
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                background: !value ? "var(--blue-bg)" : "transparent",
                color: !value ? "var(--blue)" : "var(--t2)",
                transition: "all .1s",
              }}
            >
              {allLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

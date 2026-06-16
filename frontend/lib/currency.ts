/**
 * Format a PKR amount stored in paise (integer × 100).
 * Negative amounts use accounting bracket notation: (PKR 5,000)
 */
export function fmtPkr(paise: number, compact = false): string {
  const negative = paise < 0;
  const abs = Math.abs(paise) / 100;

  let text: string;
  if (compact) {
    if (abs >= 1_000_000) text = `PKR ${(abs / 1_000_000).toFixed(1)}M`;
    else if (abs >= 1_000) text = `PKR ${(abs / 1_000).toFixed(0)}K`;
    else text = `PKR ${abs.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  } else {
    text = `PKR ${abs.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  }

  return negative ? `(${text})` : text;
}

/** Returns "var(--red)" for negative paise values, or the provided positive colour. */
export function pkrColor(paise: number, positiveColor?: string): string | undefined {
  return paise < 0 ? "var(--red)" : positiveColor;
}

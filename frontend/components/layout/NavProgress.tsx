"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  function start() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (doneRef.current) clearTimeout(doneRef.current);
    startedRef.current = true;
    setVisible(true);
    setWidth(0);

    let w = 0;
    function tick() {
      // Rush to ~70% quickly then crawl — gives a sense of progress
      const increment = w < 30 ? 4 : w < 60 ? 2 : w < 80 ? 0.6 : 0.1;
      w = Math.min(w + increment, 90);
      setWidth(w);
      if (w < 90) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function finish() {
    if (!startedRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setWidth(100);
    doneRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
      startedRef.current = false;
    }, 250);
  }

  // Intercept every internal link click → start the bar
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("/") && !href.startsWith("//")) {
        start();
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Pathname changes → navigation committed → finish the bar
  useEffect(() => {
    finish();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "var(--blue)",
          boxShadow: "0 0 6px var(--blue), 0 0 12px rgba(24,95,165,0.4)",
          transition:
            width === 100
              ? "width 0.12s ease"
              : "width 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}

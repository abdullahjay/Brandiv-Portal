"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@frontend/context/ThemeContext";
import QueryProvider from "@frontend/providers/QueryProvider";
import NavProgress from "@frontend/components/layout/NavProgress";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeProvider>
          <NavProgress />
          {children}
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  );
}

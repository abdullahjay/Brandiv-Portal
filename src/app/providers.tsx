"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@frontend/context/ThemeContext";
import { NotificationsProvider } from "@frontend/context/NotificationsContext";
import NavProgress from "@frontend/components/layout/NavProgress";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <NotificationsProvider>
          <NavProgress />
          {children}
        </NotificationsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

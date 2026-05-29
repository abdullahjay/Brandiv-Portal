"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { NavSection, SessionUser } from "@frontend/types";
import { hasModuleAccess } from "@/lib/permissions";

const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",       href: "/dashboard",    icon: "ti-layout-dashboard", module: "dashboard" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Clients",         href: "/clients",      icon: "ti-users",            module: "clients" },
      { label: "Projects",        href: "/projects",     icon: "ti-briefcase",        module: "projects" },
      { label: "Stakeholders",    href: "/stakeholders", icon: "ti-user-share",       module: "stakeholders" },
      { label: "Pipeline",        href: "/pipeline",     icon: "ti-filter",           module: "pipeline" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Income",          href: "/income",       icon: "ti-cash",             module: "income" },
      { label: "Invoices",        href: "/invoices",     icon: "ti-file-invoice",     module: "invoices" },
      { label: "Financial Ledger",href: "/transactions", icon: "ti-list-details",     module: "transactions" },
      { label: "Expenses",        href: "/expenses",     icon: "ti-receipt",          module: "expenses" },
      { label: "Payroll",         href: "/payroll",      icon: "ti-wallet",           module: "payroll" },
      { label: "Accounts",        href: "/accounts",     icon: "ti-building-bank",    module: "accounts" },
      { label: "Transfers",       href: "/transfers",    icon: "ti-transfer",         module: "transfers" },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Time Tracking",   href: "/time-tracking",icon: "ti-clock",            module: "time-tracking" },
      { label: "Commissions",     href: "/commissions",  icon: "ti-percentage",       module: "commissions" },
      { label: "Employees",       href: "/employees",    icon: "ti-id-badge",         module: "employees" },
      { label: "Users",           href: "/users",        icon: "ti-user-circle",      module: "users" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Statements",      href: "/reports",      icon: "ti-report-analytics", module: "reports" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings",        href: "/settings",     icon: "ti-settings",         module: "settings" },
    ],
  },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

interface SidebarProps {
  user: SessionUser;
  logoUrl?: string | null;
  companyName?: string | null;
}

export default function Sidebar({ user, logoUrl, companyName }: SidebarProps) {
  const pathname = usePathname();

  // Track which item was clicked so we can highlight it INSTANTLY,
  // before usePathname() updates (which only happens after full navigation).
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Once the actual pathname catches up, clear the pending state.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function isActive(href: string) {
    // Optimistic: if user just clicked this item, treat it as active immediately.
    if (pendingHref) return pendingHref === href;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const brandName = companyName || "Brandiv CRM";

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        background: "var(--bg1)",
        borderRight: "0.5px solid var(--b3)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
      }}
    >
      {/* Brand / Logo */}
      <div
        style={{
          padding: "18px 18px 16px",
          borderBottom: "0.5px solid var(--b3)",
          display: "flex",
          alignItems: "center",
          minHeight: 62,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brandName}
            style={{ maxWidth: 140, maxHeight: 32, objectFit: "contain", objectPosition: "left center" }}
          />
        ) : (
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {brandName}
          </div>
        )}
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, paddingBottom: 8 }}>
        {NAV.map((section) => {
          const visibleItems = section.items.filter((item) =>
            hasModuleAccess(user.role, item.module)
          );
          if (visibleItems.length === 0) return null;

          return (
          <div key={section.label} style={{ paddingTop: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--t3)",
                padding: "0 18px 4px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {section.label}
            </div>

            {visibleItems.map((item) => {
              const active = isActive(item.href);
              const pending = pendingHref === item.href && pendingHref !== pathname;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setPendingHref(item.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 18px",
                    fontSize: 13,
                    color: active ? "var(--blue)" : "var(--t2)",
                    background: active ? "var(--blue-bg)" : "transparent",
                    borderLeft: `2px solid ${active ? "var(--blue)" : "transparent"}`,
                    fontWeight: active ? 600 : 400,
                    textDecoration: "none",
                    transition: "background 0.08s, color 0.08s, border-color 0.08s",
                    userSelect: "none",
                    borderRadius: "0 6px 6px 0",
                    marginRight: 8,
                    opacity: pending ? 0.75 : 1,
                  }}
                >
                  <i
                    className={`ti ${item.icon}`}
                    style={{ fontSize: 15, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {/* Tiny spinner while this item's page is loading */}
                  {pending && (
                    <i
                      className="ti ti-loader-2"
                      style={{
                        fontSize: 12,
                        color: "var(--blue)",
                        animation: "spin 0.7s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}
      </div>

      {/* User footer */}
      <div
        style={{
          borderTop: "0.5px solid var(--b3)",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--blue-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--blue)",
            flexShrink: 0,
            border: "1.5px solid var(--blue)",
          }}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            initials(user.name)
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--t1)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "capitalize", letterSpacing: "0.03em" }}>
            {user.role.replace(/_/g, " ")}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className="ib"
          style={{ width: 26, height: 26, flexShrink: 0, border: "none" }}
        >
          <i className="ti ti-logout" style={{ fontSize: 13 }} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

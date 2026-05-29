interface BadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
}

const STATUS_MAP: Record<string, string> = {
  // Client / general
  active: "badge-active",
  paid: "badge-active",
  approved: "badge-active",
  completed: "badge-active",
  cleared: "badge-active",
  signed: "badge-active",
  // Warning
  pending: "badge-pending",
  sent: "badge-sent",
  // Neutral
  inactive: "badge-inactive",
  done: "badge-done",
  "not_sent": "badge-inactive",
  // Error
  overdue: "badge-overdue",
  rejected: "badge-overdue",
  cancelled: "badge-overdue",
  // Info
  draft: "badge-draft",
  lead: "badge-lead",
  new: "badge-new",
  info: "badge-info",
  // Project types
  recurring: "badge-recurring",
  one_time: "badge-one-time",
  milestone: "badge-milestone",
};

export default function Badge({ status, label, size = "md" }: BadgeProps) {
  const cls = STATUS_MAP[status] ?? "badge-info";
  const display = label ?? status.replace(/_/g, " ");

  return (
    <span
      className={`badge ${cls}`}
      style={size === "sm" ? { fontSize: 9, padding: "1px 6px" } : undefined}
    >
      {display.charAt(0).toUpperCase() + display.slice(1)}
    </span>
  );
}

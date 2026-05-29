"use client";

import Topbar from "@frontend/components/layout/Topbar";
import TimeEntryList from "@frontend/components/time-tracking/TimeEntryList";

export default function TimeTrackingPage() {
  return (
    <>
      <Topbar title="Time Tracking" />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <TimeEntryList />
      </div>
    </>
  );
}

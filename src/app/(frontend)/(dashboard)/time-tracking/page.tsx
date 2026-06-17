"use client";

import Topbar from "@frontend/components/layout/Topbar";
import TimeEntryList from "@frontend/components/time-tracking/TimeEntryList";

export default function TimeTrackingPage() {
  return (
    <>
      <Topbar title="Time Tracking" />
      <div className="page-content">
        <TimeEntryList />
      </div>
    </>
  );
}

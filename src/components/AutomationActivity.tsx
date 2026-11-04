"use client";

import { relativeTime } from "@/lib/labels";

type Event = {
  _id: string;
  type: "request_notification" | "overdue_reminder";
  status: "sent" | "failed";
  summary: string;
  createdAt: number;
};

export default function AutomationActivity({ events }: { events: Event[] }) {
  if (!events.length) {
    return (
      <p className="muted small">No automation activity yet.</p>
    );
  }

  return (
    <ul className="activity-list">
      {events.map((event) => (
        <li key={event._id}>
          <span className={event.status === "failed" ? "badge badge--warn" : "badge"}>
            {event.type === "overdue_reminder" ? "Reminder" : "Notify"}
          </span>
          <span>
            {event.summary}{" "}
            <span className="muted">· {relativeTime(event.createdAt)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

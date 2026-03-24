"use client";

import { useEffect, useState } from "react";
import { AttendanceBanner } from "@/components/layout/attendance-banner";
import { formatDateTimeZhTWFromUnknown } from "@/lib/datetime";

type OpenEvent = {
  id: string;
  title: string;
  closes_at_iso: string | null;
  is_attended?: boolean;
};

export function AttendanceBannerGate() {
  const [event, setEvent] = useState<OpenEvent | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/attendance/open")
      .then((r) => r.json())
      .then((d: { events?: OpenEvent[] }) => {
        if (cancelled) return;
        const first = d.events?.[0];
        setEvent(first ?? null);

        // If user already signed in, auto-hide after some time
        if (first?.is_attended) {
          setTimeout(() => {
            if (!cancelled) setVisible(false);
          }, 6000);
        }
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!event || !visible) return null;

  const deadline =
    event.closes_at_iso != null
      ? formatDateTimeZhTWFromUnknown(event.closes_at_iso)
      : "—";

  return (
    <AttendanceBanner
      eventName={event.title}
      deadline={deadline}
      isAttended={event.is_attended}
    />
  );
}

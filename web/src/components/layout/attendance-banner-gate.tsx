"use client";

import { useEffect, useState } from "react";
import { AttendanceBanner } from "@/components/layout/attendance-banner";
import { formatDateTimeZhTWFromUnknown } from "@/lib/datetime";
import { useAuth } from "@/lib/auth-context";
import { getOpenAttendanceEvents } from "@/lib/client-firestore";

type OpenEvent = {
  id: string;
  title: string;
  closes_at_iso: string | null;
  is_attended?: boolean;
};

export function AttendanceBannerGate() {
  const { firebaseUser } = useAuth();
  const [event, setEvent] = useState<OpenEvent | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOpenAttendanceEvents()
      .then((events) => {
        if (cancelled) return;
        const first = events?.[0];
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
  }, [firebaseUser?.uid]);

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

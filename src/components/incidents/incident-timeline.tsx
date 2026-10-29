"use client";

import { useState } from "react";
import { Chip } from "@/components/ui";
import { reasonLabel } from "@/lib/labels";
import type { getIncident } from "@/server/db/incidents-queries";

type MemberAlert = NonNullable<Awaited<ReturnType<typeof getIncident>>>["members"][number];

type LaneKey =
  | "firewall"
  | "core_switch"
  | "access_switch"
  | "access_point"
  | "server"
  | "other";

const LANES: { key: LaneKey; label: string }[] = [
  { key: "firewall", label: "Firewall / SD-WAN" },
  { key: "core_switch", label: "Core switch" },
  { key: "access_switch", label: "Access switch" },
  { key: "access_point", label: "Access point" },
  { key: "server", label: "Server" },
  { key: "other", label: "Other" },
];

function assignLane(deviceType?: string | null): LaneKey {
  if (!deviceType) return "other";
  const dt = deviceType.toLowerCase();
  if (dt.includes("firewall") || dt.includes("sdwan") || dt.includes("sd-wan")) {
    return "firewall";
  }
  if (dt.includes("core")) {
    return "core_switch";
  }
  if (dt.includes("access_switch") || dt.includes("switch")) {
    return "access_switch";
  }
  if (dt.includes("access_point") || dt.includes("ap") || dt.includes("wifi")) {
    return "access_point";
  }
  if (dt.includes("server") || dt.includes("windows") || dt.includes("linux") || dt.includes("storage")) {
    return "server";
  }
  return "other";
}

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const shortTimeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function humanize(text?: string | null): string {
  if (!text) return "—";
  return text.replace(/_/g, " ");
}

export function IncidentTimeline({ members }: { members: MemberAlert[] }) {
  // State to track which lanes are expanded when they exceed the collapse threshold
  const [expandedLanes, setExpandedLanes] = useState<Record<string, boolean>>({});

  function toggleLane(laneKey: string) {
    setExpandedLanes((prev) => ({
      ...prev,
      [laneKey]: !prev[laneKey],
    }));
  }

  // Group alerts by lane
  const groupedByLane = LANES.map((lane) => {
    const alertsInLane = members.filter((m) => assignLane(m.deviceType) === lane.key);
    return {
      ...lane,
      alerts: alertsInLane,
    };
  }).filter((group) => group.alerts.length > 0);

  return (
    <div className="space-y-6">
      {groupedByLane.map((laneGroup) => {
        const total = laneGroup.alerts.length;
        const isCollapsed = total > 5 && !expandedLanes[laneGroup.key];

        // If collapsed: show first 2, a collapsed indicator with summary times, and last 2
        const visibleAlerts = isCollapsed
          ? [...laneGroup.alerts.slice(0, 2), ...laneGroup.alerts.slice(-2)]
          : laneGroup.alerts;

        const hiddenCount = total - 4;
        const alertFirstHidden = laneGroup.alerts[2];
        const alertLastHidden = laneGroup.alerts[total - 3];
        const hiddenStart =
          total > 4 && alertFirstHidden
            ? shortTimeFormat.format(alertFirstHidden.createdAt)
            : "";
        const hiddenEnd =
          total > 4 && alertLastHidden
            ? shortTimeFormat.format(alertLastHidden.createdAt)
            : "";

        return (
          <div
            key={laneGroup.key}
            className="rounded-xl border border-line bg-surface p-5 space-y-4 shadow-xs"
          >
            {/* Lane Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-heading">
                  {laneGroup.label}
                </h3>
              </div>
              <span className="text-xs text-muted font-medium">
                {total} {total === 1 ? "alert" : "alerts"}
              </span>
            </div>

            {/* Vertical timeline items */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
              {visibleAlerts.map((alert, idx) => {
                const isRoot = alert.isRoot;
                const isRepeat = alert.isRepeat;

                // If collapsed and we just rendered the first 2 items, insert the collapse toggle bar
                const showCollapseBar = isCollapsed && idx === 1;

                return (
                  <div
                    key={alert.alertId}
                    id={`alert-${alert.alertId}`}
                    className="space-y-4 scroll-mt-6"
                  >
                    <div className="relative flex items-start gap-4 text-xs group">
                      {/* Node circle on the vertical timeline */}
                      <div className="absolute -left-6 top-1 flex items-center justify-center">
                        {isRoot ? (
                          <span
                            className="size-3.5 rounded-full bg-accent ring-4 ring-accent/20"
                            title="Root alert (Probable cause)"
                          />
                        ) : isRepeat ? (
                          <span
                            className="size-2.5 rounded-full border-2 border-muted bg-surface"
                            title={`Repeat alert of ${alert.repeatOf ?? "previous"}`}
                          />
                        ) : (
                          <span
                            className="size-2.5 rounded-full bg-muted/80"
                            title="Member alert"
                          />
                        )}
                      </div>

                      {/* Time on the left */}
                      <div className="w-24 shrink-0 font-mono text-muted text-[11px] pt-0.5">
                        {timeFormat.format(alert.createdAt)} IST
                      </div>

                      {/* Content */}
                      <div
                        className={`flex-1 rounded-lg p-3 transition ${
                          isRoot
                            ? "bg-accent/5 border border-accent/30"
                            : "bg-chip/30 border border-line/60"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-heading">
                              {alert.alertId}
                            </span>
                            {isRoot && (
                              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                Probable cause
                              </span>
                            )}
                            {isRepeat && (
                              <span className="rounded bg-chip px-1.5 py-0.5 text-[10px] font-semibold text-muted border border-line">
                                Repeat of {alert.repeatOf ?? "previous"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-muted text-[11px]">
                            <span>{alert.host || humanize(alert.deviceType)}</span>
                            <span>·</span>
                            <span className="font-medium text-heading">
                              {humanize(alert.symptom)}
                            </span>
                          </div>
                        </div>

                        {/* Subject */}
                        <p className="mt-1.5 text-xs text-body leading-relaxed">
                          {alert.subject || "No subject text recorded"}
                        </p>

                        {/* Reason codes */}
                        {alert.reason && (
                          <div className="mt-2.5 flex flex-wrap gap-1 pt-1.5 border-t border-line/50">
                            {alert.reason
                              .split(",")
                              .map((r) => r.trim())
                              .filter(Boolean)
                              .map((r) => (
                                <Chip key={r} className="text-[10px] py-0.5">
                                  {reasonLabel(r)}
                                </Chip>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Collapsed Bar */}
                    {showCollapseBar && (
                      <div className="relative my-2 pl-4">
                        <button
                          type="button"
                          onClick={() => toggleLane(laneGroup.key)}
                          className="flex w-full items-center justify-between rounded-lg border border-dashed border-line bg-chip/50 px-4 py-2 text-left text-xs font-semibold text-accent hover:bg-chip hover:border-accent transition"
                        >
                          <span>
                            +{hiddenCount} more {laneGroup.label.toLowerCase()} alerts
                            between {hiddenStart} and {hiddenEnd} IST
                          </span>
                          <span className="underline">Expand sequence ↓</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Collapse button when expanded */}
            {!isCollapsed && total > 5 && (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => toggleLane(laneGroup.key)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Collapse sequence ↑
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ITALY_MAP_REGIONS } from "@/data/italy-map-regions";
import { latLngToItalyMapSvg } from "@/lib/marketing/italy-map-geo";
import {
  AMBIENT_CITY_PINS,
  CLIENT_DEMAND_MESSAGES,
  WORKER_DEMAND_MESSAGES,
  RECRUITMENT_DEMAND_MESSAGES,
  type DemandMessage,
} from "@/lib/marketing/italy-demand-messages";
import { cn } from "@/lib/utils";

type Variant = "client" | "worker" | "recruitment";

type Props = {
  variant: Variant;
  className?: string;
};

const ROTATION_MS = 2100;
const VISIBLE_PIN_COUNT = 3;

function messageToPin(message: DemandMessage) {
  return { ...latLngToItalyMapSvg(message.lat, message.lng), message };
}

function visibleIndices(length: number, activeIndex: number, count: number) {
  return Array.from({ length: Math.min(count, length) }, (_, offset) => (activeIndex + offset) % length);
}

export function ItalyDemandMap({ variant, className }: Props) {
  const reduceMotion = useReducedMotion();
  const messages =
    variant === "client"
      ? CLIENT_DEMAND_MESSAGES
      : variant === "recruitment"
        ? RECRUITMENT_DEMAND_MESSAGES
        : WORKER_DEMAND_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [messages.length, reduceMotion]);

  const pins = useMemo(() => messages.map(messageToPin), [messages]);
  const ambientPins = useMemo(
    () => AMBIENT_CITY_PINS.map((city) => ({ ...latLngToItalyMapSvg(city.lat, city.lng), label: city.label })),
    []
  );

  const active = pins[index] ?? pins[0];
  const activeId = active?.message.id;
  const visibleMessageIndices = visibleIndices(messages.length, index, VISIBLE_PIN_COUNT);
  const livePinIds = new Set(
    visibleMessageIndices.map((i) => messages[i]?.id).filter(Boolean)
  );
  const liveRegionIds = new Set(
    visibleMessageIndices.map((i) => messages[i]?.regionId).filter(Boolean)
  );

  return (
    <div
      className={cn(
        "relative mx-auto w-full min-w-0 max-w-[min(100%,28rem)] overflow-hidden rounded-2xl surface-card sm:max-w-md",
        className
      )}
    >
      <p className="absolute left-3 right-3 top-3 z-10 mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-white/95 px-2.5 py-1 text-center text-[10px] font-medium text-muted shadow-sm sm:left-4 sm:right-auto sm:px-3 sm:text-[11px]">
        Attività in tempo reale · Italia
      </p>

      <svg
        viewBox="-10 20 480 580"
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full bg-[#eef4fb]"
        role="img"
        aria-label="Cartina Italia con richieste SOS in tempo reale"
      >
        <rect x="-10" y="20" width="480" height="580" fill="#eef4fb" />

        {ITALY_MAP_REGIONS.map((region) => {
          const isActiveRegion = active?.message.regionId === region.id;
          const isLiveRegion = liveRegionIds.has(region.id);

          return (
            <path
              key={region.id}
              d={region.path}
              fill={isActiveRegion ? "#dbeafe" : isLiveRegion ? "#eff6ff" : "#f7f7f7"}
              stroke={isActiveRegion ? "#2563eb" : isLiveRegion ? "#93c5fd" : "#999"}
              strokeWidth={isActiveRegion ? 1.1 : isLiveRegion ? 0.8 : 0.6}
              strokeLinejoin="round"
              aria-label={region.name}
            />
          );
        })}

        {ambientPins.map((pin) => (
          <circle
            key={pin.label}
            cx={pin.x}
            cy={pin.y}
            r={2.5}
            fill="#94a3b8"
            opacity={0.55}
          />
        ))}

        {pins.map(({ x, y, message }) => {
          const isActive = message.id === activeId;
          const isLive = livePinIds.has(message.id);
          if (!isLive) return null;

          return (
            <g key={message.id} transform={`translate(${x} ${y})`}>
              {isActive && !reduceMotion ? (
                <circle r={10} fill="#2563eb" opacity={0.18}>
                  <animate attributeName="r" values="6;12;6" dur="1.2s" repeatCount="indefinite" />
                </circle>
              ) : isLive && !reduceMotion ? (
                <circle r={7} fill="#2563eb" opacity={0.1}>
                  <animate attributeName="opacity" values="0.08;0.16;0.08" dur="1.6s" repeatCount="indefinite" />
                </circle>
              ) : null}
              <circle
                r={isActive ? 4.2 : 3.2}
                fill={isActive ? "#2563eb" : "#3b82f6"}
                opacity={isActive ? 1 : 0.75}
              />
            </g>
          );
        })}

        {active ? (
          <foreignObject
            x={Math.min(Math.max(active.x - 72, -4), 360)}
            y={Math.max(active.y - 58, 24)}
            width={144}
            height={52}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active.message.id}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-center shadow-md"
              >
                <p className="text-[9px] font-semibold uppercase tracking-wide text-brand">
                  {variant === "client"
                    ? "In tempo reale"
                    : variant === "recruitment"
                      ? "Opportunità lavoro"
                      : "Nuova richiesta"}
                </p>
                <p className="text-[11px] font-medium leading-tight text-foreground">
                  {active.message.text}
                </p>
                <p className="text-[10px] text-muted">{active.message.place}</p>
              </motion.div>
            </AnimatePresence>
          </foreignObject>
        ) : null}
      </svg>

      <div className="border-t border-[var(--border)] bg-white px-3 py-3 sm:px-4" aria-live="polite">
        <p className="text-[10px] font-medium uppercase tracking-wide text-brand sm:text-[11px]">
          {variant === "client"
            ? "In tempo reale"
            : variant === "recruitment"
              ? "Talent pool · Italia"
              : "Nuova richiesta"}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={active?.message.id}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-1 break-words text-sm font-medium text-foreground"
          >
            {active?.message.text} · {active?.message.place}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

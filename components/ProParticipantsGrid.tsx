"use client";
import React, { useState, useMemo, useCallback, useRef } from "react";
import { useCallStateHooks, ParticipantView, useCall } from "@stream-io/video-react-sdk";
import { Pin, PinOff } from "lucide-react";

type P = any;

function getId(p: P): string {
  return (p?.sessionId ?? p?.userId ?? "") as string;
}

function Tile({
  participant,
  isLocal,
  pinned,
  onPinToggle,
}: {
  participant: P;
  isLocal: boolean;
  pinned: boolean;
  onPinToggle: () => void;
}) {
  const tracks: string[] = (participant as any)?.publishedTracks ?? [];
  const hasVideo =
    tracks.includes("camera" as any) || tracks.includes("video" as any);

  return (
    // NOTE: plain <div> — no Framer Motion here to avoid fade on re-mount
    <div
      className={[
        "pro-video-tile",
        hasVideo ? "cam-on" : "",
        "relative aspect-video rounded-2xl bg-black overflow-hidden isolate",
        "ring-1 ring-white/10",
        "shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]",
      ].join(" ")}
    >
      {/* Live video; mirror local for selfie view */}
      <div className={["absolute inset-0", isLocal && hasVideo ? "mirror" : ""].join(" ")}>
        <ParticipantView participant={participant} />
      </div>

      {/* Pin button */}
      <div className="pointer-events-auto absolute right-2 top-2 z-10">
        <button
          onClick={onPinToggle}
          className="rounded-full bg-black/55 text-white p-2 hover:bg-black/70 transition"
          title={pinned ? "Unpin" : "Pin"}
        >
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
        <div className="h-24 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* Name (single source of truth) */}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate rounded bg-black/40 px-2 py-1 text-[12px] leading-none text-white">
            {(participant as any).name ?? (participant as any).userId}
          </div>
          {isLocal && (
            <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" />
      </div>
    </div>
  );
}

export default function ProParticipantsGrid() {
  const call = useCall();
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  const participants = useParticipants() as P[];
  const local = useLocalParticipant() as P | null;

  // Stable ordering index assigned once per participant (prevents reordering on DOM changes)
  const orderRef = useRef<Map<string, number>>(new Map());
  const nextIndexRef = useRef(0);

  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const onPinToggle = useCallback((id: string) => {
    setPinnedId((prev) => (prev === id ? null : id));
  }, []);

  const ordered = useMemo(() => {
    // Assign stable index if new participant appears
    for (const p of participants) {
      const id = getId(p);
      if (id && !orderRef.current.has(id)) {
        orderRef.current.set(id, nextIndexRef.current++);
      }
    }
    // Build a stable-sorted list:
    // 1) pinned first
    // 2) local second
    // 3) others by assigned stable index (join order)
    const arr = [...participants];
    const localId = local ? getId(local) : null;
    arr.sort((a, b) => {
      const aid = getId(a);
      const bid = getId(b);

      // pinned > ...
      if (pinnedId) {
        if (aid === pinnedId && bid !== pinnedId) return -1;
        if (bid === pinnedId && aid !== pinnedId) return 1;
      }

      // local next
      if (localId) {
        if (aid === localId && bid !== localId) return -1;
        if (bid === localId && aid !== localId) return 1;
      }

      const ai = orderRef.current.get(aid) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderRef.current.get(bid) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;

      // final tiebreaker: id
      return String(aid).localeCompare(String(bid));
    });

    return arr;
  }, [participants, pinnedId, local]);

  const count = ordered.length;
  const template =
    count === 1
      ? "repeat(1, minmax(640px, 1fr))"
      : "repeat(auto-fit, minmax(320px, 1fr))";

  return (
    <div
      className="grid gap-4 p-4 place-content-center max-w-[1600px] mx-auto"
      style={{ gridTemplateColumns: template as any }}
    >
      {ordered.map((p) => {
        const id = getId(p);
        const isLocal =
          !!local &&
          id === getId(local);

        const pinned = pinnedId === id;

        return (
          <div
            key={id}
            className={[
              pinned ? "col-span-1 lg:col-span-2" : "",
              count === 3 ? "lg:[&:nth-child(3)]:col-span-2" : "",
            ].join(" ")}
          >
            <Tile
              participant={p}
              isLocal={isLocal}
              pinned={pinned}
              onPinToggle={() => onPinToggle(id)}
            />
          </div>
        );
      })}
    </div>
  );
}


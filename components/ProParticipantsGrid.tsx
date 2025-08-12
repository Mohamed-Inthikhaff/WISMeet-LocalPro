"use client";
import { useState, useMemo, useCallback } from "react";
import { useCallStateHooks, ParticipantView, useCall } from "@stream-io/video-react-sdk";
import { Pin, PinOff } from "lucide-react";
import { motion } from "framer-motion";

type P = any;

function Tile({
  p, isLocal, pinned, onPinToggle,
}: { p: P; isLocal: boolean; pinned: boolean; onPinToggle: () => void }) {
  const tracks: string[] = (p as any)?.publishedTracks ?? [];
  const hasVideo = tracks.includes("camera" as any) || tracks.includes("video" as any);
  const audioLevel: number = (p as any)?.audioLevel ?? 0;
  const isSpeaking = audioLevel > 0.02;

  return (
    <motion.div
      layout
      initial={{ opacity: 0.0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={[
        "pro-video-tile",               // identifier for our CSS
        hasVideo ? "cam-on" : "",       // flag: camera is publishing
        "relative aspect-video rounded-2xl bg-black overflow-hidden isolate",
        "shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/5",
        isSpeaking ? "outline outline-2 outline-blue-500/60" : "outline outline-1 outline-white/10",
      ].join(" ")}
      // remove paint containment to avoid sub-pixel artifacts on ultra-wide viewports
      // style={{ contain: "paint" }}
    >
      {/* Live video; mirror local for selfie view */}
      <div className={["absolute inset-0", isLocal && hasVideo ? "mirror" : ""].join(" ")}>
        <ParticipantView participant={p} />
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

      {/* Name + mic */}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate rounded bg-black/40 px-2 py-1 text-[12px] leading-none text-white">
            {(p as any).name ?? (p as any).userId}
          </div>
          {isLocal && (
            <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80">
              You
            </span>
          )}
        </div>
        {/* rely on Stream's built-in mic badge; no duplicate icon here */}
        <div className="flex items-center gap-2" />
      </div>
    </motion.div>
  );
}

export default function ProParticipantsGrid() {
  const call = useCall();
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  const participants = useParticipants() as P[];
  const local = useLocalParticipant() as P | null;

  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const onPinToggle = useCallback((id: string) => {
    setPinnedId(prev => (prev === id ? null : id));
  }, []);

  // Order: pinned > local > others
  const ordered = useMemo(() => {
    const arr = [...participants];
    const key = (x: P) => (x?.sessionId ?? x?.userId ?? "") as string;
    arr.sort((a, b) => {
      const aid = key(a), bid = key(b);
      if (pinnedId) {
        if (aid === pinnedId) return -1;
        if (bid === pinnedId) return 1;
      }
      if (local && (aid === key(local) || bid === key(local))) {
        return aid === key(local) ? -1 : 1;
      }
      return 0;
    });
    return arr;
  }, [participants, pinnedId, local]);

  const count = ordered.length;

  // Smart template:
  // - 1 participant: one big centered tile
  // - 2 participants: 2 columns
  // - 3 participants: auto-fit (320px min) => usually 2 on row 1, 1 centered on row 2; wide screens show 3 across
  // - 4+: auto-fit fills rows nicely
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
        const id = (p as any).sessionId ?? (p as any).userId ?? "";
        const isLocal =
          !!local &&
          id === ((local as any).sessionId ?? (local as any).userId ?? "");

        const pinned = pinnedId === id;

        return (
          <div
            key={id}
            className={[
              // When pinned and there's room, let it span 2 columns on large screens
              pinned ? "col-span-1 lg:col-span-2" : "",
              // With exactly 3 participants, center the last one by making it span 2 on medium screens
              count === 3 ? "md:[&:nth-child(3)]:col-span-2" : "",
            ].join(" ")}
          >
            <Tile p={p} isLocal={isLocal} pinned={pinned} onPinToggle={() => onPinToggle(id)} />
          </div>
        );
      })}
    </div>
  );
}


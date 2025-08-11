"use client";
import { useCallStateHooks, ParticipantView } from "@stream-io/video-react-sdk";

export default function ParticipantsGrid() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3">
      {participants.map((p) => (
        <div key={p.sessionId} className="relative rounded-2xl overflow-hidden bg-black">
          <ParticipantView participant={p} />
          <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
            {p.name ?? p.userId}
          </div>
        </div>
      ))}
    </div>
  );
}

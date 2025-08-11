"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCall, CallingState, useCallStateHooks } from "@stream-io/video-react-sdk";

type MediaBusState = {
  getAudioTrack: () => MediaStreamTrack | null;
};

const Ctx = createContext<MediaBusState>({ getAudioTrack: () => null });

export const MediaBusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // When joined, read the microphone track from Stream SDK and hold it.
  useEffect(() => {
    if (!call) return;

    // Prefer SDK-owned track; do NOT call getUserMedia here.
    const t = call.microphone.getTrack?.() as MediaStreamTrack | undefined;
    if (t && t.readyState !== "ended") {
      setTrack(t);
      trackRef.current = t;
      console.log('🎤 MediaBus: Track acquired', {
        trackId: t.id,
        state: t.readyState,
        enabled: t.enabled
      });
    }

    // Keep track if SDK replaces/refreshes mic internally
    const onMicrophoneStateChanged = () => {
      const nt = call.microphone.getTrack?.() as MediaStreamTrack | undefined;
      if (nt && nt !== trackRef.current && nt.readyState !== "ended") {
        console.log('🎤 MediaBus: Track refreshed', {
          oldTrackId: trackRef.current?.id,
          newTrackId: nt.id,
          state: nt.readyState
        });
        trackRef.current = nt;
        setTrack(nt);
      }
    };

    call.on("microphoneStateChanged", onMicrophoneStateChanged);
    return () => {
      call.off("microphoneStateChanged", onMicrophoneStateChanged);
    };
  }, [call, callingState]);

  const value = useMemo(
    () => ({ getAudioTrack: () => trackRef.current }),
    []
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useMediaBus = () => useContext(Ctx);

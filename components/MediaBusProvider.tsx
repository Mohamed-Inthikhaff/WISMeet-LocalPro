"use client";
import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback,
} from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";

type MediaBusState = {
  getAudioTrack: () => MediaStreamTrack | null;
  version: number; // increments whenever the authoritative mic track changes
};

const Ctx = createContext<MediaBusState>({ getAudioTrack: () => null, version: 0 });

export const MediaBusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [version, setVersion] = useState(0);

  const pickMicTrack = useCallback((): MediaStreamTrack | null => {
    const anyCall = call as any;

    // 1) Combined local MediaStream (preferred if available)
    const ms: MediaStream | undefined = anyCall?.state?.mediaStream;
    const tFromMs = ms?.getAudioTracks?.()[0];
    if (tFromMs && tFromMs.readyState !== "ended") return tFromMs;

    // 2) Microphone manager may expose a track directly
    const tFromMicState: MediaStreamTrack | undefined = anyCall?.microphone?.state?.track;
    if (tFromMicState && tFromMicState.readyState !== "ended") return tFromMicState;

    // 3) Or a dedicated MediaStream for the mic
    const micMs: MediaStream | undefined = anyCall?.microphone?.state?.mediaStream;
    const tFromMicMs = micMs?.getAudioTracks?.()[0];
    if (tFromMicMs && tFromMicMs.readyState !== "ended") return tFromMicMs;

    return null;
  }, [call]);

  useEffect(() => {
    if (!call) return;

    const update = () => {
      const next = pickMicTrack();
      if (next !== trackRef.current && next?.readyState !== "ended") {
        trackRef.current = next;
        setVersion(v => v + 1); // notify consumers
      }
    };

    // Initial & on calling state change
    update();

    // Subscribe (version-safe)
    const anyCall = call as any;
    anyCall?.on?.("microphoneStateChanged", update);
    anyCall?.on?.("localTrackPublished", update);
    anyCall?.on?.("localTrackUnpublished", update);

    return () => {
      anyCall?.off?.("microphoneStateChanged", update);
      anyCall?.off?.("localTrackPublished", update);
      anyCall?.off?.("localTrackUnpublished", update);
    };
  }, [call, callingState, pickMicTrack]);

  const value = useMemo(() => ({
    getAudioTrack: () => trackRef.current,
    version,
  }), [version]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useMediaBus = () => useContext(Ctx);

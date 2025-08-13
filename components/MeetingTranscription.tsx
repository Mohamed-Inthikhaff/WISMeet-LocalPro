'use client';

import { useEffect, useRef, useState } from 'react';
import { createTranscriptionService, TranscriptionService } from '@/lib/transcription-service';
import { transcriptContext } from '@/lib/transcript-context';
import { useMediaBus } from '@/components/MediaBusProvider';

interface MeetingTranscriptionProps {
  meetingId: string;
  isActive: boolean;
  onTranscriptUpdate?: (transcript: string) => void;
}

const MeetingTranscription = ({ meetingId, isActive, onTranscriptUpdate }: MeetingTranscriptionProps) => {
  const { audioTrack, version } = useMediaBus();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputStream, setInputStream] = useState<MediaStream | null>(null);
  
  // Use refs to guard concurrent start/stop operations
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => { 
      mountedRef.current = false; 
    };
  }, []);

  // Keep latest onTranscriptUpdate in a ref to avoid re-initializing service
  useEffect(() => {
    onTranscriptUpdateRef.current = onTranscriptUpdate;
  }, [onTranscriptUpdate]);

  // Build a cloned stream for transcription consumers whenever the authoritative track changes.
  useEffect(() => {
    const t = audioTrack;
    if (t && t.readyState !== "ended") {
      const clone = t.clone();
      const s = new MediaStream([clone]);
      setInputStream(s);
      console.log('🎤 Transcription: Cloned track created', {
        originalTrackId: t.id,
        clonedTrackId: clone.id,
        streamId: s.id
      });
      return () => {
        // only stop the clone
        clone.stop();
        console.log('🎤 Transcription: Cloned track stopped', {
          clonedTrackId: clone.id
        });
      };
    } else {
      setInputStream(null);
      console.log('🎤 Transcription: No audio track available for cloning');
    }
  }, [audioTrack, version]); // <- key change

  // Initialize transcription service only when meetingId changes
  useEffect(() => {
    if (!meetingId) return;

    // Clean up previous service if it exists
    transcriptionServiceRef.current?.stopTranscription().catch(() => {});
    transcriptionServiceRef.current = createTranscriptionService({
      meetingId,
      inputStream: inputStream || undefined, // Convert null to undefined for compatibility
      onTranscriptUpdate: (newTranscript) => {
        transcriptContext.setTranscript(meetingId, newTranscript);
        onTranscriptUpdateRef.current?.(newTranscript);
      },
      onError: (errorMessage) => { 
        if (mountedRef.current) setError(errorMessage); 
      }
    });

    return () => {
      transcriptionServiceRef.current?.stopTranscription().catch(() => {});
      transcriptionServiceRef.current = null;
    };
  }, [meetingId, inputStream]);

  // Start/stop transcription based on meeting state with proper guards
  useEffect(() => {
    const svc = transcriptionServiceRef.current;
    if (!svc) return;

    const start = async () => {
      if (isStartingRef.current || isRecordingRef.current || !isActive) return;
      isStartingRef.current = true;
      setError(null);
      const ok = await svc.startTranscription();
      if (mountedRef.current && ok) { 
        setIsRecording(true); 
        isRecordingRef.current = true; 
      }
      isStartingRef.current = false;
    };

    const stop = async () => {
      if (isStoppingRef.current || !isRecordingRef.current) return;
      isStoppingRef.current = true;
      const finalT = await svc.stopTranscription();
      if (mountedRef.current) { 
        setIsRecording(false); 
        isRecordingRef.current = false; 
        onTranscriptUpdateRef.current?.(finalT); 
      }
      isStoppingRef.current = false;
    };

    if (isActive) start(); else stop();
  }, [isActive, meetingId]);

  // Handle visibility changes - pause on hidden, resume on visible
  useEffect(() => {
    const onVis = () => {
      const svc = transcriptionServiceRef.current;
      if (!svc) return;
      
      if (document.hidden) {
        if (isRecordingRef.current && !isStoppingRef.current) {
          svc.stopTranscription().catch(() => {});
        }
        isRecordingRef.current = false;
        if (mountedRef.current) setIsRecording(false);
      } else if (isActive && !isStartingRef.current && !isRecordingRef.current) {
        svc.startTranscription().then(ok => {
          if (mountedRef.current && ok) { 
            setIsRecording(true); 
            isRecordingRef.current = true; 
          }
        }).catch(() => {});
      }
    };
    
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isActive]);

  // Don't render anything visible - this is a background service
  return null;
};

export default MeetingTranscription; 
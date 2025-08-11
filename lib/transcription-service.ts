/**
 * Real-time Transcription Service using Web Speech API
 * Handles speech recognition without MediaStream usage
 */

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface TranscriptionConfig {
  meetingId: string;
  inputStream?: MediaStream; // Optional input stream from MediaBus
  onTranscriptUpdate?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface TranscriptionState {
  isRecording: boolean;
  transcript: string;
  duration: number;
  error: string | null;
}

export class TranscriptionService {
  private meetingId: string;
  private recognition: SpeechRecognition | null = null;
  private transcript = '';
  private isRecording = false;
  private isStarting = false;
  private backoffMs = 500;
  private readonly MAX_BACKOFF = 10000;
  private onTranscriptUpdate?: (transcript: string) => void;
  private onError?: (error: string) => void;
  private startTime = 0;
  private inputStream?: MediaStream; // Store the input stream

  constructor({ meetingId, inputStream, onTranscriptUpdate, onError }: TranscriptionConfig) {
    this.meetingId = meetingId;
    this.inputStream = inputStream;
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onError = onError;
  }

  private ensureRecognizer() {
    if (this.recognition) return;
    
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) throw new Error('Speech recognition not supported');
    
    const rec: SpeechRecognition = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    // If we have an input stream from MediaBus, use it
    // Note: Web Speech API doesn't directly accept MediaStream, but we can
    // use it for audio analysis if needed. For now, we'll rely on the system mic
    // since the Stream SDK is already capturing audio for the call.

    rec.onresult = (evt: SpeechRecognitionEvent) => {
      this.backoffMs = 500; // reset backoff on success
      let final = '';
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        if (evt.results[i].isFinal) {
          final += evt.results[i][0].transcript + ' ';
        }
      }
      if (final) {
        this.transcript += final;
        this.onTranscriptUpdate?.(this.transcript);
      }
    };

    rec.onend = () => {
      this.isRecording = false;
      // Chrome ends after silence or time; schedule restart if still desired
      this.scheduleRestart();
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      this.isRecording = false;
      if (['network', 'no-speech', 'audio-capture', 'aborted'].includes(e?.error)) {
        this.scheduleRestart();
      } else {
        this.onError?.(`Speech recognition error: ${e?.error ?? 'unknown'}`);
      }
    };

    this.recognition = rec;
  }

  private scheduleRestart() {
    if (!this.recognition) return;
    if (document.hidden) return; // wait until visible
    if (!this.isRecording) return; // only if caller still wants recording
    
    const wait = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.MAX_BACKOFF);
    setTimeout(() => { void this.safeStart(); }, wait);
  }

  private async safeStart(): Promise<boolean> {
    if (this.isStarting || this.isRecording) return true;
    this.isStarting = true;
    
    try {
      this.ensureRecognizer();
      // small delay helps avoid start-after-stop races
      await new Promise(r => setTimeout(r, 300));
      this.recognition!.start();
      this.isRecording = true;
      if (!this.startTime) this.startTime = Date.now();
      return true;
    } catch (err) {
      this.scheduleRestart();
      return false;
    } finally {
      this.isStarting = false;
    }
  }

  async startTranscription(): Promise<boolean> {
    this.isRecording = true;
    try {
      return await this.safeStart();
    } catch (e: any) {
      this.onError?.(`Failed to start transcription: ${e?.message ?? 'Unknown error'}`);
      this.isRecording = false;
      return false;
    }
  }

  async stopTranscription(): Promise<string> {
    // Caller no longer wants recording
    this.isRecording = false;
    try {
      if (this.recognition) {
        try { 
          this.recognition.stop(); 
        } catch {} // ignore stop errors
      }
      // give browser a moment to flush final results
      await new Promise(r => setTimeout(r, 300));
    } catch (e: any) {
      this.onError?.(`Failed to stop transcription: ${e?.message ?? 'Unknown error'}`);
    }
    return this.transcript;
  }

  getTranscript(): string {
    return this.transcript;
  }

  clearTranscript(): void {
    this.transcript = '';
    this.onTranscriptUpdate?.('');
  }

  getState(): TranscriptionState {
    return {
      isRecording: this.isRecording,
      transcript: this.transcript,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      error: null
    };
  }

  static isSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }
}

/**
 * Create a new transcription service instance
 */
export const createTranscriptionService = (config: TranscriptionConfig): TranscriptionService => {
  return new TranscriptionService(config);
}; 
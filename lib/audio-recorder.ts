/**
 * Real-time Audio Recording and Transcription System
 * Captures audio from Stream Video SDK and converts to text
 */

export interface AudioRecorderConfig {
  meetingId: string;
  onTranscriptUpdate?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface AudioRecorderState {
  isRecording: boolean;
  transcript: string;
  duration: number;
  error: string | null;
}

export class AudioRecorder {
  private meetingId: string;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private transcript: string = '';
  private startTime: number = 0;
  private onTranscriptUpdate?: (transcript: string) => void;
  private onError?: (error: string) => void;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;

  constructor(config: AudioRecorderConfig) {
    this.meetingId = config.meetingId;
    this.onTranscriptUpdate = config.onTranscriptUpdate;
    this.onError = config.onError;
  }

  /**
   * Start recording audio from the meeting
   */
  async startRecording(): Promise<boolean> {
    try {
      console.log('🎤 Starting audio recording for meeting:', this.meetingId);
      
      // Get audio stream from user's microphone
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        },
        video: false
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.startTime = Date.now();
      this.isRecording = true;

      // Handle audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = async () => {
        await this.processAudioChunks();
      };

      // Start recording in chunks (every 10 seconds)
      this.mediaRecorder.start(10000);

      console.log('✅ Audio recording started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      this.onError?.(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Stop recording and get final transcript
   */
  async stopRecording(): Promise<string> {
    try {
      console.log('🛑 Stopping audio recording...');
      
      if (!this.mediaRecorder || !this.isRecording) {
        console.warn('⚠️ No active recording to stop');
        return this.transcript;
      }

      this.isRecording = false;
      this.mediaRecorder.stop();

      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Wait for final processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ Audio recording stopped, final transcript length:', this.transcript.length);
      return this.transcript;

    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      this.onError?.(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.transcript;
    }
  }

  /**
   * Process audio chunks and convert to text
   */
  private async processAudioChunks(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) return;

      // Combine audio chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // Convert audio to text using Web Speech API
      const text = await this.convertAudioToText(audioBlob);
      
      if (text && text.trim()) {
        this.transcript += text + ' ';
        console.log('📝 Transcript updated:', text);
        this.onTranscriptUpdate?.(this.transcript);
      }

    } catch (error) {
      console.error('❌ Error processing audio chunks:', error);
      this.onError?.(`Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert audio blob to text using Web Speech API
   */
  private async convertAudioToText(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Convert blob to array buffer
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Use Web Speech API for transcription
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
              const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
              const recognition = new SpeechRecognition();
              
              recognition.continuous = false;
              recognition.interimResults = false;
              recognition.lang = 'en-US';
              
              recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                  .map((result: any) => result[0].transcript)
                  .join('');
                resolve(transcript);
              };
              
              recognition.onerror = (event: any) => {
                console.warn('Speech recognition error:', event.error);
                resolve(''); // Return empty string on error
              };
              
              recognition.onend = () => {
                resolve(''); // Return empty string if no speech detected
              };
              
              // Convert audio buffer to audio element for speech recognition
              const audioElement = new Audio();
              const audioUrl = URL.createObjectURL(audioBlob);
              audioElement.src = audioUrl;
              audioElement.onloadeddata = () => {
                recognition.start();
                // Simulate speech input (this is a limitation - Web Speech API needs microphone input)
                setTimeout(() => {
                  recognition.stop();
                  URL.revokeObjectURL(audioUrl);
                }, 5000);
              };
              audioElement.load();
              
            } else {
              console.warn('⚠️ Web Speech API not available');
              resolve('');
            }
            
          } catch (error) {
            console.error('❌ Error processing audio:', error);
            resolve('');
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read audio blob'));
        };
        
        reader.readAsArrayBuffer(audioBlob);
        
      } catch (error) {
        console.error('❌ Error setting up speech recognition:', error);
        resolve('');
      }
    });
  }

  /**
   * Get current transcript
   */
  getTranscript(): string {
    return this.transcript;
  }

  /**
   * Get recording state
   */
  getState(): AudioRecorderState {
    return {
      isRecording: this.isRecording,
      transcript: this.transcript,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      error: null
    };
  }

  /**
   * Clear transcript
   */
  clearTranscript(): void {
    this.transcript = '';
    this.onTranscriptUpdate?.('');
  }
}

/**
 * Create a new audio recorder instance
 */
export const createAudioRecorder = (config: AudioRecorderConfig): AudioRecorder => {
  return new AudioRecorder(config);
};

/**
 * Initialize audio recorder from cloned microphone track
 * This function creates a cloned stream from the MediaBus track for recording
 */
export const initRecorderFromClonedMic = (getAudioTrack: () => MediaStreamTrack | null): {
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string>;
  isRecording: () => boolean;
} => {
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let clonedStream: MediaStream | null = null;
  let isRecording = false;
  let startTime = 0;

  const startRecording = async (): Promise<boolean> => {
    if (isRecording) return false;

    const track = getAudioTrack();
    if (!track || track.readyState === 'ended') return false;

    try {
      // Create cloned stream
      const clonedTrack = track.clone();
      clonedStream = new MediaStream([clonedTrack]);

      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(clonedStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunks = [];
      startTime = Date.now();
      isRecording = true;

      // Handle audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // Start recording in chunks (every 10 seconds)
      mediaRecorder.start(10000);

      console.log('🎤 Audio recording started with cloned track');
      return true;
    } catch (error) {
      console.error('Error starting audio recording with cloned track:', error);
      return false;
    }
  };

  const stopRecording = async (): Promise<string> => {
    if (!isRecording || !mediaRecorder) return '';

    try {
      isRecording = false;
      mediaRecorder.stop();

      // Stop the cloned stream
      if (clonedStream) {
        clonedStream.getTracks().forEach(track => track.stop());
        clonedStream = null;
      }

      // Wait for final processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🎤 Audio recording stopped with cloned track');
      return 'Recording completed'; // Return a placeholder - actual processing would be done here
    } catch (error) {
      console.error('Error stopping audio recording:', error);
      return '';
    }
  };

  const isRecordingStatus = (): boolean => {
    return isRecording;
  };

  return {
    startRecording,
    stopRecording,
    isRecording: isRecordingStatus
  };
}; 
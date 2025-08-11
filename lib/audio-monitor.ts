/**
 * Audio Monitoring System
 * Provides real-time audio health monitoring and automatic recovery
 */

export interface AudioHealthStatus {
  isHealthy: boolean;
  microphoneEnabled: boolean;
  audioLevel: number;
  connectionQuality: 'good' | 'fair' | 'poor';
  issues: string[];
  lastCheck: Date;
}

export interface AudioRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  enableAutoRecovery: boolean;
  healthCheckInterval?: number;
}

export class AudioMonitor {
  private isMonitoring = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private onHealthChange: ((status: AudioHealthStatus) => void) | null = null;
  private recoveryOptions: AudioRecoveryOptions;
  public isInCall: boolean = false; // Public flag to prevent getUserMedia during calls
  private isInCallGuard = false; // Renamed private flag

  constructor(options: Partial<AudioRecoveryOptions> = {}) {
    this.recoveryOptions = {
      maxRetries: 3,
      retryDelay: 2000,
      enableAutoRecovery: true,
      healthCheckInterval: 30000,
      ...options,
    };
  }

  public setInCall(value: boolean) {
    this.isInCall = value; // Set the public flag
    this.isInCallGuard = value; // Keep the private flag for backward compatibility
  }

  async startMonitoring(onHealthChange: (status: AudioHealthStatus) => void) {
    if (this.isMonitoring) return;

    this.onHealthChange = onHealthChange;
    this.isMonitoring = true;

    // Perform initial health check
    await this.performHealthCheck();

    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => {
      void this.performHealthCheck();
    }, this.recoveryOptions.healthCheckInterval);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.onHealthChange = null;
  }

  private async performHealthCheck(): Promise<AudioHealthStatus> {
    // Skip health checks entirely if in a call
    if (this.isInCall) {
      const status: AudioHealthStatus = {
        isHealthy: true, // Assume OK; SDK is in control
        microphoneEnabled: true, // We don't inspect; avoid device grabs
        audioLevel: 0, // Skip level measurement
        connectionQuality: 'good',
        issues: [],
        lastCheck: new Date(),
      };
      
      // Notify listeners *without* triggering recovery
      if (this.onHealthChange) this.onHealthChange(status);
      
      // Skip auto recovery entirely while in-call
      return status;
    }

    const status: AudioHealthStatus = {
      isHealthy: true,
      microphoneEnabled: false,
      audioLevel: 0,
      connectionQuality: 'good',
      issues: [],
      lastCheck: new Date(),
    };

    try {
      // Only check microphone if not in a call
      if (!this.isInCall) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        status.microphoneEnabled = true;
        
        // Measure audio level
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        status.audioLevel = average;
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }
    } catch (error) {
      status.isHealthy = false;
      status.issues.push('Microphone access failed');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          status.issues.push('Permission denied');
        } else if (error.name === 'NotFoundError') {
          status.issues.push('No microphone found');
        } else if (error.name === 'NotReadableError') {
          status.issues.push('Microphone in use by another application');
        }
      }
    }

    // Notify listeners
    if (this.onHealthChange) {
      this.onHealthChange(status);
    }

    // Only attempt recovery if not in a call
    if (!this.isInCall && this.recoveryOptions.enableAutoRecovery && !status.isHealthy) {
      await this.attemptRecovery(status);
    }

    return status;
  }

  private async attemptRecovery(status: AudioHealthStatus): Promise<void> {
    // Skip recovery attempts if in a call
    if (this.isInCall) return;

    let attempts = 0;
    const maxAttempts = this.recoveryOptions.maxRetries;

    while (attempts < maxAttempts && !status.isHealthy) {
      attempts++;
      console.log(`Audio recovery attempt ${attempts}/${maxAttempts}`);

      try {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.recoveryOptions.retryDelay));

        // Try to re-establish microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        stream.getTracks().forEach(track => track.stop());
        
        // Update status
        status.isHealthy = true;
        status.microphoneEnabled = true;
        status.issues = [];
        
        console.log('Audio recovery successful');
        break;
      } catch (error) {
        console.warn(`Audio recovery attempt ${attempts} failed:`, error);
        status.issues.push(`Recovery attempt ${attempts} failed`);
      }
    }

    if (!status.isHealthy) {
      console.error('Audio recovery failed after all attempts');
      status.issues.push('Recovery failed after all attempts');
    }

    // Update status
    if (this.onHealthChange) {
      this.onHealthChange(status);
    }
  }

  /**
   * Force refresh audio devices
   */
  private async forceRefreshAudio(): Promise<void> {
    try {
      // Stop all existing audio streams
      const streams = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = streams.filter(device => device.kind === 'audioinput');
      
      // Request new audio stream to refresh devices
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });
      
      // Stop the test stream
      newStream.getTracks().forEach(track => track.stop());
      
      console.log('🔄 Audio devices refreshed');
    } catch (error) {
      console.error('Error refreshing audio devices:', error);
      throw error;
    }
  }

  /**
   * Clean up audio context
   */
  private cleanupAudioContext(): void {
    // This method is no longer used as AudioContext is managed per check
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): { isActive: boolean; lastCheck?: Date } {
    return {
      isActive: this.isMonitoring,
      lastCheck: undefined // No direct lastCheck property in the new class
    };
  }

  /**
   * Update recovery options
   */
  updateRecoveryOptions(options: Partial<AudioRecoveryOptions>): void {
    this.recoveryOptions = { ...this.recoveryOptions, ...options };
  }
}

// Export singleton instance
export const audioMonitor = new AudioMonitor();

// Export utility functions
export const checkAudioPermissions = async (): Promise<boolean> => {
  try {
    const permission = await navigator.permissions.query({ 
      name: 'microphone' as PermissionName 
    });
    return permission.state === 'granted';
  } catch (error) {
    console.error('Error checking audio permissions:', error);
    return false;
  }
};

export const testMicrophoneAccess = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioTracks = stream.getAudioTracks();
    
    // Clean up
    stream.getTracks().forEach(track => track.stop());
    
    return { success: audioTracks.length > 0 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getAudioDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return [];
  }
}; 
/**
 * Comprehensive Automatic Summary Triggers
 * Handles all scenarios where meetings might end unexpectedly
 */

export interface SummaryTriggerData {
  meetingId: string;
  startTime: string;
  endTime: string;
  triggerType: 'host_departure' | 'call_ended' | 'page_closed' | 'all_participants_left' | 'meeting_timeout' | 'network_disconnected' | 'manual_end';
}

export interface TriggerConfig {
  meetingId: string;
  call: any;
  localParticipant: any;
  isHost: boolean;
}

/**
 * Triggers automatic summary generation
 */
export const triggerAutomaticSummary = async (data: SummaryTriggerData): Promise<void> => {
  try {
    console.log(`🤖 Triggering automatic summary (${data.triggerType}) for meeting: ${data.meetingId}`);
    
    const response = await fetch('/api/mortgage-assistant/auto-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      console.log(`✅ Automatic summary generated successfully (${data.triggerType})`);
    } else {
      console.warn(`⚠️ Automatic summary generation failed (${data.triggerType})`);
    }
  } catch (error) {
    console.error(`❌ Error generating automatic summary (${data.triggerType}):`, error);
  }
};

/**
 * Comprehensive automatic summary trigger system
 */
export class AutomaticSummaryTriggers {
  private config: TriggerConfig;
  private timeoutId: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private eventHandlers: {
    participantLeft?: (participant: any) => void;
    callStateChanged?: (state: any) => void;
    beforeUnload?: () => void;
    visibilityChange?: () => void;
    online?: () => void;
    offline?: () => void;
  } = {};

  constructor(config: TriggerConfig) {
    this.config = config;
  }

  /**
   * Get meeting ID from config
   */
  getMeetingId(): string {
    return this.config.meetingId;
  }

  /**
   * Start monitoring all trigger scenarios
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    console.log('🎯 Starting comprehensive automatic summary monitoring...');
    this.isMonitoring = true;

    // 1. Host departure detection
    this.setupHostDepartureDetection();
    
    // 2. Call state monitoring
    this.setupCallStateMonitoring();
    
    // 3. Page close detection
    this.setupPageCloseDetection();
    
    // 4. Meeting timeout
    this.setupMeetingTimeout();
    
    // 5. Network disconnection
    this.setupNetworkMonitoring();
    
    // 6. All participants left
    this.setupAllParticipantsLeft();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    console.log('🛑 Stopping automatic summary monitoring...');
    this.isMonitoring = false;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Remove event listeners
    this.removeEventListeners();
  }

  /**
   * Setup host departure detection
   */
  private setupHostDepartureDetection(): void {
    if (!this.config.isHost) return;

    this.eventHandlers.participantLeft = (participant: any) => {
      if (participant.userId === this.config.localParticipant.userId) {
        console.log('🏠 Host left the meeting, triggering automatic summary...');
        this.triggerSummary('host_departure');
      }
    };

    this.config.call.on('participantLeft', this.eventHandlers.participantLeft);
  }

  /**
   * Setup call state monitoring
   */
  private setupCallStateMonitoring(): void {
    this.eventHandlers.callStateChanged = (state: any) => {
      if (state === 'ended' || state === 'disconnected') {
        console.log('📞 Call ended/disconnected, triggering automatic summary...');
        this.triggerSummary('call_ended');
      }
    };

    this.config.call.on('call.state.changed', this.eventHandlers.callStateChanged);
  }

  /**
   * Setup page close detection
   */
  private setupPageCloseDetection(): void {
    if (!this.config.isHost) return;

    this.eventHandlers.beforeUnload = () => {
      console.log('🔄 Page closing, triggering automatic summary...');
      this.triggerSummary('page_closed');
    };

    this.eventHandlers.visibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Page hidden, triggering automatic summary...');
        this.triggerSummary('page_closed');
      }
    };

    window.addEventListener('beforeunload', this.eventHandlers.beforeUnload);
    document.addEventListener('visibilitychange', this.eventHandlers.visibilityChange);
  }

  /**
   * Setup meeting timeout
   */
  private setupMeetingTimeout(): void {
    const MEETING_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
    
    if (!this.config.call?.state.createdAt) return;

    this.timeoutId = setTimeout(() => {
      console.log('⏰ Meeting timeout reached, triggering automatic summary...');
      this.triggerSummary('meeting_timeout');
    }, MEETING_TIMEOUT);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (!this.config.isHost) return;

    this.eventHandlers.online = () => {
      if (!navigator.onLine) {
        console.log('🌐 Network disconnected, triggering automatic summary...');
        this.triggerSummary('network_disconnected');
      }
    };

    this.eventHandlers.offline = () => {
      if (!navigator.onLine) {
        console.log('🌐 Network disconnected, triggering automatic summary...');
        this.triggerSummary('network_disconnected');
      }
    };

    window.addEventListener('online', this.eventHandlers.online);
    window.addEventListener('offline', this.eventHandlers.offline);
  }

  /**
   * Setup all participants left detection
   */
  private setupAllParticipantsLeft(): void {
    this.eventHandlers.participantLeft = (participant: any) => {
      const remainingParticipants = this.config.call.state.participants.filter(
        (p: any) => p.userId !== participant.userId
      );
      
      if (remainingParticipants.length === 0 && this.config.localParticipant) {
        console.log('🤖 All participants left, triggering automatic summary...');
        this.triggerSummary('all_participants_left');
      }
    };

    this.config.call.on('participantLeft', this.eventHandlers.participantLeft);
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    // Remove call event listeners
    if (this.eventHandlers.participantLeft) {
      this.config.call.off('participantLeft', this.eventHandlers.participantLeft);
    }
    if (this.eventHandlers.callStateChanged) {
      this.config.call.off('call.state.changed', this.eventHandlers.callStateChanged);
    }
    
    // Remove window event listeners
    if (this.eventHandlers.beforeUnload) {
      window.removeEventListener('beforeunload', this.eventHandlers.beforeUnload);
    }
    if (this.eventHandlers.online) {
      window.removeEventListener('online', this.eventHandlers.online);
    }
    if (this.eventHandlers.offline) {
      window.removeEventListener('offline', this.eventHandlers.offline);
    }
    
    // Remove document event listeners
    if (this.eventHandlers.visibilityChange) {
      document.removeEventListener('visibilitychange', this.eventHandlers.visibilityChange);
    }

    // Clear all event handler references
    this.eventHandlers = {};
  }

  /**
   * Trigger summary with proper data
   */
  private triggerSummary(triggerType: SummaryTriggerData['triggerType']): void {
    const data: SummaryTriggerData = {
      meetingId: this.config.meetingId,
      startTime: this.config.call.state.createdAt,
      endTime: new Date().toISOString(),
      triggerType
    };

    triggerAutomaticSummary(data);
  }
}

/**
 * Create automatic summary triggers instance
 */
export const createAutomaticSummaryTriggers = (config: TriggerConfig): AutomaticSummaryTriggers => {
  return new AutomaticSummaryTriggers(config);
}; 
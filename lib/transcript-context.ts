/**
 * Transcript Context
 * Simple way to share meeting transcript between components
 */

class TranscriptContext {
  private transcripts: Map<string, string> = new Map();

  /**
   * Set transcript for a meeting
   */
  setTranscript(meetingId: string, transcript: string): void {
    this.transcripts.set(meetingId, transcript);
    console.log(`📝 Transcript updated for meeting ${meetingId}:`, transcript.length, 'characters');
  }

  /**
   * Get transcript for a meeting
   */
  getTranscript(meetingId: string): string {
    return this.transcripts.get(meetingId) || '';
  }

  /**
   * Clear transcript for a meeting
   */
  clearTranscript(meetingId: string): void {
    this.transcripts.delete(meetingId);
  }

  /**
   * Get all transcripts
   */
  getAllTranscripts(): Map<string, string> {
    return new Map(this.transcripts);
  }
}

// Create singleton instance
export const transcriptContext = new TranscriptContext(); 
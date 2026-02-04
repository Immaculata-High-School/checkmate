/**
 * Document Activity Tracker
 * Monitors and records user activity while writing documents
 */

export interface ActivityEvent {
  eventType: 'KEYSTROKE' | 'PASTE' | 'CUT' | 'DELETE' | 'UNDO' | 'REDO' | 
             'FOCUS' | 'BLUR' | 'SELECT' | 'CURSOR_MOVE' | 'SESSION_START' | 'SESSION_END';
  timestamp: string;
  position: number;
  endPosition?: number;
  content?: string;
  contentLength?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface TrackerOptions {
  documentId: string;
  batchSize?: number;
  flushInterval?: number;
  enabled?: boolean;
  onFlush?: (events: ActivityEvent[]) => void;
}

export class DocumentActivityTracker {
  private documentId: string;
  private sessionId: string;
  private eventQueue: ActivityEvent[] = [];
  private batchSize: number;
  private flushInterval: number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean;
  private onFlush?: (events: ActivityEvent[]) => void;
  private lastKeystrokeTime: number = 0;
  private keystrokeBuffer: string = '';
  private keystrokePosition: number = 0;
  private sessionStartTime: number;
  private totalTypingTime: number = 0;
  private lastActivityTime: number = 0;
  private pasteRegions: Array<{ start: number; end: number; content: string; timestamp: number }> = [];

  constructor(options: TrackerOptions) {
    this.documentId = options.documentId;
    this.sessionId = this.generateSessionId();
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 5000; // 5 seconds
    this.enabled = options.enabled ?? true;
    this.onFlush = options.onFlush;
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();

    if (this.enabled) {
      this.startSession();
      this.startFlushTimer();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSession() {
    this.addEvent({
      eventType: 'SESSION_START',
      timestamp: new Date().toISOString(),
      position: 0,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : undefined
      }
    });
  }

  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  private addEvent(event: Omit<ActivityEvent, 'sessionId'>) {
    if (!this.enabled) return;

    this.eventQueue.push({
      ...event,
      sessionId: this.sessionId
    });

    this.lastActivityTime = Date.now();

    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  // Flush buffered keystrokes as a single event
  private flushKeystrokeBuffer() {
    if (this.keystrokeBuffer.length > 0) {
      this.addEvent({
        eventType: 'KEYSTROKE',
        timestamp: new Date(this.lastKeystrokeTime).toISOString(),
        position: this.keystrokePosition,
        content: this.keystrokeBuffer,
        contentLength: this.keystrokeBuffer.length,
        metadata: {
          duration: Date.now() - this.lastKeystrokeTime,
          speed: this.calculateTypingSpeed()
        }
      });
      this.keystrokeBuffer = '';
    }
  }

  private calculateTypingSpeed(): number {
    // Characters per minute
    const sessionDuration = (Date.now() - this.sessionStartTime) / 60000; // in minutes
    if (sessionDuration < 0.1) return 0;
    return Math.round(this.totalTypingTime / sessionDuration);
  }

  // Track keystroke
  trackKeystroke(char: string, position: number) {
    if (!this.enabled) return;

    const now = Date.now();
    
    // If it's been more than 2 seconds since last keystroke, flush buffer
    if (now - this.lastKeystrokeTime > 2000 && this.keystrokeBuffer.length > 0) {
      this.flushKeystrokeBuffer();
    }

    // Start new buffer or append
    if (this.keystrokeBuffer.length === 0) {
      this.keystrokePosition = position;
    }
    
    this.keystrokeBuffer += char;
    this.lastKeystrokeTime = now;
    this.totalTypingTime++;
  }

  // Track paste event
  trackPaste(content: string, position: number) {
    if (!this.enabled) return;

    this.flushKeystrokeBuffer();

    // Store paste region for highlighting
    this.pasteRegions.push({
      start: position,
      end: position + content.length,
      content,
      timestamp: Date.now()
    });

    this.addEvent({
      eventType: 'PASTE',
      timestamp: new Date().toISOString(),
      position,
      endPosition: position + content.length,
      content: content.substring(0, 5000), // Limit stored content
      contentLength: content.length,
      metadata: {
        truncated: content.length > 5000,
        wordCount: content.split(/\s+/).filter(w => w).length
      }
    });
  }

  // Track cut event
  trackCut(content: string, position: number, endPosition: number) {
    if (!this.enabled) return;

    this.flushKeystrokeBuffer();

    this.addEvent({
      eventType: 'CUT',
      timestamp: new Date().toISOString(),
      position,
      endPosition,
      content: content.substring(0, 1000),
      contentLength: content.length
    });
  }

  // Track delete
  trackDelete(position: number, length: number = 1, isBackspace: boolean = true) {
    if (!this.enabled) return;

    this.flushKeystrokeBuffer();

    this.addEvent({
      eventType: 'DELETE',
      timestamp: new Date().toISOString(),
      position,
      contentLength: length,
      metadata: { isBackspace }
    });
  }

  // Track undo
  trackUndo(position: number) {
    if (!this.enabled) return;
    this.flushKeystrokeBuffer();

    this.addEvent({
      eventType: 'UNDO',
      timestamp: new Date().toISOString(),
      position
    });
  }

  // Track redo
  trackRedo(position: number) {
    if (!this.enabled) return;
    this.flushKeystrokeBuffer();

    this.addEvent({
      eventType: 'REDO',
      timestamp: new Date().toISOString(),
      position
    });
  }

  // Track focus
  trackFocus() {
    if (!this.enabled) return;

    this.addEvent({
      eventType: 'FOCUS',
      timestamp: new Date().toISOString(),
      position: 0
    });
  }

  // Track blur (focus lost)
  trackBlur() {
    if (!this.enabled) return;

    this.flushKeystrokeBuffer();

    this.addEvent({
      eventType: 'BLUR',
      timestamp: new Date().toISOString(),
      position: 0,
      metadata: {
        timeInFocus: Date.now() - this.lastActivityTime
      }
    });
  }

  // Track text selection
  trackSelection(start: number, end: number, selectedText: string) {
    if (!this.enabled) return;

    this.addEvent({
      eventType: 'SELECT',
      timestamp: new Date().toISOString(),
      position: start,
      endPosition: end,
      contentLength: end - start,
      content: selectedText.substring(0, 500)
    });
  }

  // Get paste regions for highlighting
  getPasteRegions() {
    return this.pasteRegions;
  }

  // Flush events to server
  async flush(): Promise<void> {
    this.flushKeystrokeBuffer();

    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`/api/docs/work/${this.documentId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      });

      if (!response.ok) {
        // Re-add events on failure
        this.eventQueue = [...eventsToSend, ...this.eventQueue];
        console.error('Failed to flush activity events');
      }

      if (this.onFlush) {
        this.onFlush(eventsToSend);
      }
    } catch (err) {
      // Re-add events on error
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
      console.error('Error flushing activity events:', err);
    }
  }

  // End session and cleanup
  async endSession(): Promise<void> {
    this.flushKeystrokeBuffer();

    this.addEvent({
      eventType: 'SESSION_END',
      timestamp: new Date().toISOString(),
      position: 0,
      metadata: {
        sessionDuration: Date.now() - this.sessionStartTime,
        totalEvents: this.eventQueue.length
      }
    });

    await this.flush();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.flushTimer) {
      this.startFlushTimer();
    } else if (!enabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Get tracking status
  isEnabled(): boolean {
    return this.enabled;
  }

  // Get current session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Get session statistics
  getStats() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      eventsInQueue: this.eventQueue.length,
      pasteCount: this.pasteRegions.length,
      totalTypingTime: this.totalTypingTime,
      typingSpeed: this.calculateTypingSpeed()
    };
  }
}

// Create a singleton tracker instance
let trackerInstance: DocumentActivityTracker | null = null;

export function createTracker(options: TrackerOptions): DocumentActivityTracker {
  if (trackerInstance) {
    trackerInstance.endSession();
  }
  trackerInstance = new DocumentActivityTracker(options);
  return trackerInstance;
}

export function getTracker(): DocumentActivityTracker | null {
  return trackerInstance;
}

export function destroyTracker(): void {
  if (trackerInstance) {
    trackerInstance.endSession();
    trackerInstance = null;
  }
}

// Basic monitoring and alerting for Firebase usage
// This helps track potential abuse patterns

interface UsageMetrics {
  lobbiesCreated: number;
  gamesStarted: number;
  playersJoined: number;
  lastReset: number;
}

class UsageMonitor {
  private metrics: UsageMetrics = {
    lobbiesCreated: 0,
    gamesStarted: 0,
    playersJoined: 0,
    lastReset: Date.now(),
  };

  private readonly RESET_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly ALERT_THRESHOLDS = {
    lobbiesCreated: 100, // Alert if more than 100 lobbies created per hour
    gamesStarted: 50, // Alert if more than 50 games started per hour
    playersJoined: 200, // Alert if more than 200 players joined per hour
  };

  // Track an action
  track(action: keyof Omit<UsageMetrics, "lastReset">): void {
    this.resetIfNeeded();

    this.metrics[action]++;

    // Check for suspicious activity
    this.checkThresholds();
  }

  // Reset metrics if time window has passed
  private resetIfNeeded(): void {
    const now = Date.now();
    if (now - this.metrics.lastReset > this.RESET_INTERVAL) {
      this.metrics = {
        lobbiesCreated: 0,
        gamesStarted: 0,
        playersJoined: 0,
        lastReset: now,
      };
    }
  }

  // Check if any thresholds are exceeded
  private checkThresholds(): void {
    for (const [metric, threshold] of Object.entries(this.ALERT_THRESHOLDS)) {
      const current =
        this.metrics[metric as keyof typeof this.ALERT_THRESHOLDS];
      if (current >= threshold) {
        console.warn(
          `🚨 USAGE ALERT: ${metric} has reached ${current} (threshold: ${threshold})`
        );
        console.warn("This could indicate abuse or unusual traffic patterns.");

        // In a production app, you might want to:
        // - Send alerts to monitoring services
        // - Temporarily increase rate limits
        // - Log detailed information for investigation
      }
    }
  }

  // Get current metrics
  getMetrics(): UsageMetrics & { timeRemaining: number } {
    this.resetIfNeeded();
    return {
      ...this.metrics,
      timeRemaining:
        this.RESET_INTERVAL - (Date.now() - this.metrics.lastReset),
    };
  }

  // Check if usage is suspicious
  isSuspicious(): boolean {
    this.resetIfNeeded();

    // Define suspicious patterns
    const suspiciousPatterns = [
      // Too many lobbies created without games started
      this.metrics.lobbiesCreated > 20 && this.metrics.gamesStarted < 5,
      // Too many players joining without proportional games
      this.metrics.playersJoined > 50 && this.metrics.gamesStarted < 10,
      // Extremely high activity in short time
      this.metrics.lobbiesCreated > 50 || this.metrics.playersJoined > 100,
    ];

    return suspiciousPatterns.some((pattern) => pattern);
  }
}

// Global usage monitor
export const usageMonitor = new UsageMonitor();

// Helper functions to track common actions
export const trackUsage = {
  lobbyCreated: () => usageMonitor.track("lobbiesCreated"),
  gameStarted: () => usageMonitor.track("gamesStarted"),
  playerJoined: () => usageMonitor.track("playersJoined"),

  // Get current status
  getStatus: () => ({
    metrics: usageMonitor.getMetrics(),
    suspicious: usageMonitor.isSuspicious(),
  }),
};

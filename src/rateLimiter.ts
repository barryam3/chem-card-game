// Client-side rate limiting to prevent abuse
// Note: This is not foolproof security, but adds a layer of protection

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  // Check if action is allowed based on rate limits
  isAllowed(action: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const key = action;
    
    // Clean up expired entries
    this.cleanup();
    
    const entry = this.limits.get(key);
    
    if (!entry) {
      // First request for this action
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (now > entry.resetTime) {
      // Window has expired, reset
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return false;
    }
    
    // Increment count
    entry.count++;
    return true;
  }
  
  // Clean up expired entries to prevent memory leaks
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
  
  // Get remaining requests for an action
  getRemaining(action: string, maxRequests: number): number {
    const entry = this.limits.get(action);
    if (!entry || Date.now() > entry.resetTime) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - entry.count);
  }
  
  // Get time until reset (in ms)
  getResetTime(action: string): number {
    const entry = this.limits.get(action);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.resetTime - Date.now();
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  CREATE_LOBBY: { maxRequests: 5, windowMs: 60000 }, // 5 lobbies per minute
  JOIN_LOBBY: { maxRequests: 10, windowMs: 60000 }, // 10 joins per minute
  UPDATE_PLAYER_NAME: { maxRequests: 20, windowMs: 60000 }, // 20 name updates per minute
  SUBMIT_DRAFT: { maxRequests: 100, windowMs: 60000 }, // 100 draft submissions per minute
  SPELL_WORD: { maxRequests: 50, windowMs: 60000 }, // 50 word attempts per minute
} as const;

// Helper function to check rate limits with user-friendly messages
export function checkRateLimit(action: keyof typeof RATE_LIMITS): { allowed: boolean; message?: string } {
  const config = RATE_LIMITS[action];
  const allowed = rateLimiter.isAllowed(action, config.maxRequests, config.windowMs);
  
  if (!allowed) {
    const resetTime = rateLimiter.getResetTime(action);
    const resetMinutes = Math.ceil(resetTime / 60000);
    return {
      allowed: false,
      message: `Rate limit exceeded. Please wait ${resetMinutes} minute(s) before trying again.`
    };
  }
  
  return { allowed: true };
}

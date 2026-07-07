/**
 * api/_lib/rate-limiter.js — Per-Session Rate Limiting
 *
 * Enforces request quotas per session using Supabase `rate_limits` table.
 * Limits: 15 requests/minute, 200 requests/day per session.
 * Also manages user_credits for frontend display.
 */

// ── Constants ──────────────────────────────────────────────────
const RATE_LIMIT_PER_MINUTE = 15;
const RATE_LIMIT_PER_DAY = 200;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

// ── Session ID Validation ──────────────────────────────────────

/**
 * Validate session ID format.
 * Allowed: alphanumeric, hyphens, underscores, 3-64 chars.
 */
export function isValidSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return false;
  return SESSION_ID_REGEX.test(sessionId);
}

// ── Rate Limit Check ───────────────────────────────────────────

/**
 * Check if a session is within rate limits.
 *
 * @param {object} supabase - Supabase client
 * @param {string} sessionId - Session/account ID
 * @param {string} endpoint - Endpoint being accessed (for logging)
 * @returns {{ allowed, remaining_minute, remaining_day, resetIn, message }}
 */
export async function checkRateLimit(supabase, sessionId, endpoint = '/chat') {
  if (!isValidSessionId(sessionId)) {
    return {
      allowed: false,
      remaining_minute: 0,
      remaining_day: 0,
      resetIn: 0,
      message: 'Invalid session ID format',
    };
  }

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const todayStart = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');

  try {
    // Count requests in the last minute
    const { count: minuteCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', oneMinuteAgo.toISOString());

    // Count requests today
    const { count: dayCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', todayStart.toISOString());

    const currentMinute = minuteCount || 0;
    const currentDay = dayCount || 0;

    const remainingMinute = Math.max(0, RATE_LIMIT_PER_MINUTE - currentMinute);
    const remainingDay = Math.max(0, RATE_LIMIT_PER_DAY - currentDay);

    // Check if over limit
    if (currentMinute >= RATE_LIMIT_PER_MINUTE) {
      return {
        allowed: false,
        remaining_minute: 0,
        remaining_day: remainingDay,
        resetIn: 60,
        message: `Rate limit exceeded. Max ${RATE_LIMIT_PER_MINUTE} requests per minute. Try again in 60 seconds.`,
      };
    }

    if (currentDay >= RATE_LIMIT_PER_DAY) {
      const midnightUTC = new Date(todayStart);
      midnightUTC.setDate(midnightUTC.getDate() + 1);
      const resetIn = Math.ceil((midnightUTC.getTime() - now.getTime()) / 1000);

      return {
        allowed: false,
        remaining_minute: remainingMinute,
        remaining_day: 0,
        resetIn,
        message: `Daily limit exceeded. Max ${RATE_LIMIT_PER_DAY} requests per day. Resets at midnight UTC.`,
      };
    }

    // Within limits — record this request
    await supabase.from('rate_limits').insert({
      session_id: sessionId,
      endpoint,
      created_at: now.toISOString(),
    });

    return {
      allowed: true,
      remaining_minute: remainingMinute - 1,
      remaining_day: remainingDay - 1,
      resetIn: 0,
      message: 'OK',
    };
  } catch (error) {
    console.error('[rate-limiter] Error checking rate limit:', error.message);
    // Fail open — allow the request but log the error
    return {
      allowed: true,
      remaining_minute: RATE_LIMIT_PER_MINUTE,
      remaining_day: RATE_LIMIT_PER_DAY,
      resetIn: 0,
      message: 'Rate limit check failed — allowing request',
    };
  }
}

// ── Credits Management ─────────────────────────────────────────

/**
 * Increment used credits for a session.
 *
 * @param {object} supabase - Supabase client
 * @param {string} sessionId - Session/account ID
 */
export async function incrementUsage(supabase, sessionId) {
  try {
    const { data: existing } = await supabase
      .from('user_credits')
      .select('id, used_credits')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_credits')
        .update({
          used_credits: existing.used_credits + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_credits').insert({
        session_id: sessionId,
        total_credits: RATE_LIMIT_PER_DAY,
        used_credits: 1,
        last_used_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('[rate-limiter] Failed to increment credits:', e.message);
  }
}

/**
 * Get credits remaining for a session.
 *
 * @param {object} supabase - Supabase client
 * @param {string} sessionId - Session/account ID
 * @returns {{ total_credits, used_credits, remaining_credits }}
 */
export async function getCreditsRemaining(supabase, sessionId) {
  try {
    const { data } = await supabase
      .from('user_credits')
      .select('total_credits, used_credits')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (data) {
      return {
        total_credits: data.total_credits,
        used_credits: data.used_credits,
        remaining_credits: data.total_credits - data.used_credits,
      };
    }

    return {
      total_credits: RATE_LIMIT_PER_DAY,
      used_credits: 0,
      remaining_credits: RATE_LIMIT_PER_DAY,
    };
  } catch (e) {
    return {
      total_credits: RATE_LIMIT_PER_DAY,
      used_credits: 0,
      remaining_credits: RATE_LIMIT_PER_DAY,
    };
  }
}

/**
 * Initialize credits for a new user session.
 *
 * @param {object} supabase - Supabase client
 * @param {string} sessionId - Session/account ID
 */
export async function initializeCredits(supabase, sessionId) {
  try {
    const { data: existing } = await supabase
      .from('user_credits')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('user_credits').insert({
        session_id: sessionId,
        total_credits: RATE_LIMIT_PER_DAY,
        used_credits: 0,
        last_used_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('[rate-limiter] Failed to initialize credits:', e.message);
  }
}

import LoginAttempt from "../models/LoginAttempt.js";

const WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 3;

export const normalizeIdentifier = (val) => {
  if (!val) return "";
  return String(val).trim().toUpperCase();
};

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
};

// Middleware executed before attempting credentials check
export const checkLoginRateLimit = async (req, res, next) => {
  try {
    const rawIdentifier = req.body.user_code || req.body.username || req.body.email;
    if (!rawIdentifier) {
      return next();
    }

    const identifier = normalizeIdentifier(rawIdentifier);
    const ip = getClientIp(req);
    const now = new Date();

    const record = await LoginAttempt.findOne({ identifier, ip });

    if (record) {
      const timeSinceLast = now.getTime() - new Date(record.last_attempt_at).getTime();

      // If the 30-minute window has passed, reset the counter
      if (timeSinceLast > WINDOW_MS) {
        await LoginAttempt.deleteOne({ _id: record._id });
        return next();
      }

      // Check if locked
      if (record.attempts >= MAX_FAILED_ATTEMPTS) {
        const remainingMs = WINDOW_MS - timeSinceLast;
        const remainingMins = Math.max(1, Math.ceil(remainingMs / 60000));
        const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

        res.set("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          success: false,
          isRateLimited: true,
          remainingMinutes: remainingMins,
          message: `Too many failed login attempts. This account/IP is temporarily blocked. Please try again after ${remainingMins} minute${remainingMins > 1 ? "s" : ""}.`,
        });
      }
    }

    next();
  } catch (err) {
    console.error("Rate Limiter Middleware Error:", err);
    // Fail open safely so database connection quirks don't block legitimate users
    next();
  }
};

// Called when credentials check fails
export const recordFailedLogin = async (rawIdentifier, ip) => {
  try {
    const identifier = normalizeIdentifier(rawIdentifier);
    const now = new Date();

    let record = await LoginAttempt.findOne({ identifier, ip });

    if (!record) {
      record = new LoginAttempt({
        identifier,
        ip,
        attempts: 1,
        last_attempt_at: now,
      });
      await record.save();
      return 1;
    }

    const timeSinceLast = now.getTime() - new Date(record.last_attempt_at).getTime();

    if (timeSinceLast > WINDOW_MS) {
      record.attempts = 1;
    } else {
      record.attempts += 1;
    }

    record.last_attempt_at = now;
    if (record.attempts >= MAX_FAILED_ATTEMPTS) {
      record.locked_until = new Date(now.getTime() + WINDOW_MS);
    }

    await record.save();
    return record.attempts;
  } catch (err) {
    console.error("recordFailedLogin error:", err);
    return 1;
  }
};

// Called when login is successful
export const resetLoginAttempts = async (rawIdentifier, ip) => {
  try {
    const identifier = normalizeIdentifier(rawIdentifier);
    await LoginAttempt.deleteMany({
      $or: [
        { identifier, ip },
        { identifier },
      ],
    });
  } catch (err) {
    console.error("resetLoginAttempts error:", err);
  }
};

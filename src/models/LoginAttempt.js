import mongoose from "mongoose";

const loginAttemptSchema = new mongoose.Schema(
  {
    identifier: {
      type: String, // Normalized uppercase user_code or email
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    last_attempt_at: {
      type: Date,
      default: Date.now,
    },
    locked_until: {
      type: Date,
      default: null,
    },
    // Auto-expire documents after 45 minutes of inactivity so MongoDB cleans up automatically
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2700, // 45 minutes in seconds
    },
  },
  { timestamps: false }
);

// Compound index for fast lookup
loginAttemptSchema.index({ identifier: 1, ip: 1 }, { unique: true });

const LoginAttempt = mongoose.model("LoginAttempt", loginAttemptSchema);
export default LoginAttempt;

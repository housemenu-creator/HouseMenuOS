/**
 * Structured logger via pino v10.
 *
 * Thin wrapper so callers can use both patterns:
 *   logger.info({ orderId, total }, "📦 Pedido creado"); // structured
 *   logger.info("simple message");                         // plain
 *   logger.error("prefix:", err);                          // console.log compat (via rest args)
 */
import pino from "pino";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "secret",
      "authorization",
    ],
    censor: "[REDACTED]",
  },
});

// Thin wrapper that adds a pass-through overload for (string, ...rest)
function wrap(method: "info" | "error" | "warn") {
  return (...args: any[]) => {
    if (args.length <= 1) {
      (pinoLogger as any)[method](...args);
    } else if (args.length === 2 && typeof args[0] === "string") {
      // logger.info("prefix:", data) — swap to structured
      (pinoLogger as any)[method](args[1], args[0]);
    } else {
      (pinoLogger as any)[method](...args);
    }
  };
}

const logger = {
  info: wrap("info"),
  error: wrap("error"),
  warn: wrap("warn"),
};

export default logger;

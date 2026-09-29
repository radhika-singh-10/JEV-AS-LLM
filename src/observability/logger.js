const LEVELS = ["debug", "info", "warn", "error"];
const configuredLevel = process.env.LOG_LEVEL ?? "info";
const minLevel = LEVELS.includes(configuredLevel) ? configuredLevel : "info";

export function log(level, message, context = {}) {
  if (LEVELS.indexOf(level) < LEVELS.indexOf(minLevel)) return;

  const event = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  const line = JSON.stringify(event);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message, context) => log("debug", message, context),
  info: (message, context) => log("info", message, context),
  warn: (message, context) => log("warn", message, context),
  error: (message, context) => log("error", message, context)
};

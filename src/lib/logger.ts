/**
 * Structured JSON logging for the data ingestion pipeline.
 * Outputs logs in JSON format for easy parsing and analysis.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: number;
  private prefix: string;

  constructor(options: LoggerOptions = { level: "info" }) {
    this.minLevel = LOG_LEVELS[options.level];
    this.prefix = options.prefix ?? "";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: this.prefix ? `[${this.prefix}] ${message}` : message,
      ...(context && { context }),
    };
  }

  private output(entry: LogEntry): void {
    const json = JSON.stringify(entry);
    if (entry.level === "error") {
      console.error(json);
    } else if (entry.level === "warn") {
      console.warn(json);
    } else {
      console.log(json);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      this.output(this.formatEntry("debug", message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      this.output(this.formatEntry("info", message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      this.output(this.formatEntry("warn", message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      this.output(this.formatEntry("error", message, context));
    }
  }

  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({
      level: Object.entries(LOG_LEVELS).find(
        ([, v]) => v === this.minLevel
      )?.[0] as LogLevel,
      prefix: childPrefix,
    });
  }
}

// Default logger instance
export const logger = new Logger({
  level: (process.env["LOG_LEVEL"] as LogLevel) ?? "info",
});

export function createLogger(prefix: string): Logger {
  return logger.child(prefix);
}

export { Logger };

import pino, { type Logger } from 'pino';

const level = process.env.LOG_LEVEL || 'info';

// Pretty-print only in development, and only if pino-pretty is actually installed.
// Production images are built with prod-only deps (pino-pretty is a devDependency),
// so fall back to structured JSON logs instead of crashing if it is unavailable.
function createLogger(): Logger {
  if (process.env.NODE_ENV === 'development') {
    try {
      return pino({
        level,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      });
    } catch {
      // pino-pretty not available — fall through to JSON logging.
    }
  }
  return pino({ level });
}

export const logger = createLogger();

export default logger;

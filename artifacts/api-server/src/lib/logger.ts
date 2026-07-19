import pino, { type Logger } from 'pino';
import config from '../config.js';

function createLogger(): Logger {
  if (config.NODE_ENV === 'development') {
    try {
      return pino({
        level: config.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      });
    } catch {
      // pino-pretty not available — fall through to JSON logging.
    }
  }
  return pino({ level: config.LOG_LEVEL });
}

export const logger = createLogger();
export default logger;

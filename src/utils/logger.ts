type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  extra?: Record<string, unknown>;
}

const formatPrefix = (level: LogLevel, context?: string) => {
  const parts = ['[App]', level.toUpperCase()];
  if (context) parts.push(context);
  return parts.join(' ');
};

export const logger = {
  debug(message: string, options: LogOptions = {}) {
    if (__DEV__) {
      console.debug(formatPrefix('debug', options.context), message, options.extra ?? '');
    }
  },
  info(message: string, options: LogOptions = {}) {
    console.log(formatPrefix('info', options.context), message, options.extra ?? '');
  },
  warn(message: string, options: LogOptions = {}) {
    console.warn(formatPrefix('warn', options.context), message, options.extra ?? '');
  },
  error(error: unknown, options: LogOptions = {}) {
    const prefix = formatPrefix('error', options.context);
    if (error instanceof Error) {
      console.error(prefix, error.message, error.stack, options.extra ?? '');
    } else {
      console.error(prefix, error, options.extra ?? '');
    }
  },
};

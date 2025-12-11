import { logger } from '@/src/utils/logger';

class CrashReporter {
  init() {
    // In a real app, initialize Sentry or another provider here.
    if (__DEV__) {
      logger.info('CrashReporter initialized (stub)', { context: 'CrashReporter' });
    }
  }

  captureException(error: unknown, context?: string) {
    // For now, just log via logger; can be wired to Sentry later.
    logger.error(error, { context: context ?? 'CrashReporter' });
  }
}

export const crashReporter = new CrashReporter();

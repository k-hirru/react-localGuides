import { logger } from '@/src/utils/logger';

// Save originals to restore if needed
const originalDebug = console.debug;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.debug = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.debug = originalDebug;
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
});

// Force __DEV__ to true for debug logging tests
(global as any).__DEV__ = true;

describe('logger', () => {
  it('logs debug messages with [App] DEBUG prefix and context in dev', () => {
    logger.debug('hello', { context: 'Auth.login', extra: { foo: 'bar' } });

    expect(console.debug).toHaveBeenCalledWith('[App] DEBUG Auth.login', 'hello', { foo: 'bar' });
  });

  it('logs info messages with [App] INFO prefix', () => {
    logger.info('info message', { context: 'Reviews.load', extra: { id: 1 } });

    expect(console.log).toHaveBeenCalledWith('[App] INFO Reviews.load', 'info message', { id: 1 });
  });

  it('logs warn messages with [App] WARN prefix', () => {
    logger.warn('something odd', { context: 'Cache.ttl' });

    expect(console.warn).toHaveBeenCalledWith('[App] WARN Cache.ttl', 'something odd', '');
  });

  it('logs error instances with message and stack', () => {
    const error = new Error('boom');
    logger.error(error, { context: 'Geoapify.search', extra: { q: 'cafe' } });

    expect(console.error).toHaveBeenCalledWith('[App] ERROR Geoapify.search', 'boom', error.stack, {
      q: 'cafe',
    });
  });

  it('logs non-Error values as-is', () => {
    logger.error('string error', { context: 'Misc' });

    expect(console.error).toHaveBeenCalledWith('[App] ERROR Misc', 'string error', '');
  });
});

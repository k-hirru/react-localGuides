import { rateLimiter } from '@/src/utils/rateLimiter';

jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));

describe('rateLimiter.isAllowed and getRemainingTime', () => {
  afterEach(() => {
    // Reset state between tests
    (rateLimiter as any).reset('key');
  });

  it('allows first call and blocks after exceeding maxAttempts in window', () => {
    const key = 'login:user1';

    expect(rateLimiter.isAllowed(key, 2, 1000)).toBe(true); // 1st attempt
    expect(rateLimiter.isAllowed(key, 2, 1000)).toBe(true); // 2nd attempt
    expect(rateLimiter.isAllowed(key, 2, 1000)).toBe(false); // 3rd should be blocked

    const remaining = rateLimiter.getRemainingTime(key);
    expect(remaining).toBeGreaterThan(0);
  });

  it('resets window after expiry and allows again', () => {
    const key = 'login:user2';

    expect(rateLimiter.isAllowed(key, 1, 1000)).toBe(true);
    expect(rateLimiter.isAllowed(key, 1, 1000)).toBe(false);

    // Advance time beyond the window
    jest.setSystemTime(new Date('2025-01-01T00:00:02Z'));

    // Now it should allow again because the window has reset
    expect(rateLimiter.isAllowed(key, 1, 1000)).toBe(true);
  });

  it('getRemainingTime returns 0 when there is no record for the key', () => {
    expect(rateLimiter.getRemainingTime('missing')).toBe(0);
  });
});

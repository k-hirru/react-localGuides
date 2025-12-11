type AnalyticsEventName =
  | 'user_login_success'
  | 'user_signup_success'
  | 'review_submitted'
  | 'favorite_toggled';

interface AnalyticsEventProps {
  [key: string]: string | number | boolean | null | undefined;
}

class AnalyticsService {
  trackEvent(name: AnalyticsEventName, props: AnalyticsEventProps = {}) {
    // Stub for now: log to console in dev; no-op in production.
    if (__DEV__) {
      console.log('[Analytics]', name, props);
    }
  }
}

export const analyticsService = new AnalyticsService();

import {
  GEOAPIFY_API_KEY as GEOAPIFY_API_KEY_ENV,
  API_BASE_URL as API_BASE_URL_ENV,
  ENABLE_DEBUG_LOGGING as ENABLE_DEBUG_LOGGING_ENV,
} from '@env';

const bool = (v: string | undefined, fallback = false) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
};

export const Env = {
  /**
   * Geoapify API key used by src/services/geoapifyService.ts.
   * This is still a client-side key, but lives in .env instead of source.
   */
  GEOAPIFY_API_KEY: GEOAPIFY_API_KEY_ENV,

  /**
   * Optional: base URL for any custom backend.
   */
  API_BASE_URL: API_BASE_URL_ENV,

  /**
   * Guard for additional debug logging.
   */
  ENABLE_DEBUG_LOGGING: bool(ENABLE_DEBUG_LOGGING_ENV, false),
};
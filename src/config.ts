import type { GolomtConfig } from "./types.js";

/**
 * Load Golomt Bank configuration from environment variables.
 *
 * Required environment variables:
 *  - GOLOMT_ENDPOINT  - Base URL of the Golomt Bank API
 *  - GOLOMT_SECRET    - HMAC-SHA256 secret key
 *  - GOLOMT_BEARER_TOKEN - Bearer token for Authorization header
 *
 * @throws {Error} if any required variable is missing.
 */
export function loadConfigFromEnv(): GolomtConfig {
  const endpoint = process.env.GOLOMT_ENDPOINT;
  const secret = process.env.GOLOMT_SECRET;
  const bearerToken = process.env.GOLOMT_BEARER_TOKEN;

  if (!endpoint) {
    throw new Error("Missing environment variable: GOLOMT_ENDPOINT");
  }
  if (!secret) {
    throw new Error("Missing environment variable: GOLOMT_SECRET");
  }
  if (!bearerToken) {
    throw new Error("Missing environment variable: GOLOMT_BEARER_TOKEN");
  }

  return { endpoint, secret, bearerToken };
}

export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/** Gran+ monthly subscription price — single source of truth.
 *  Must match the Lemon Squeezy variant price (variant ID 1681701).
 *  Value is in cents (ZAR): 7900 = R79.00 */
export const MONTHLY_COST_CENTS = 7900; // R79.00

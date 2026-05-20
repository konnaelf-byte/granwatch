export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the path to the Clerk sign-in page.
 * Pass an optional returnPath to redirect back after login.
 */
export const getSignInUrl = (returnPath?: string): string => {
  const base = "/sign-in";
  if (!returnPath || returnPath === "/") return base;
  return `${base}?redirect_url=${encodeURIComponent(returnPath)}`;
};

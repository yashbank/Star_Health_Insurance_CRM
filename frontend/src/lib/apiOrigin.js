/** Base URL of the API server (no path). Empty in dev → same origin + Vite proxy. */
export function apiOrigin() {
  return String(import.meta.env.VITE_API_ORIGIN || "")
    .trim()
    .replace(/\/$/, "");
}

/** Axios baseURL: `/api` locally, `${origin}/api` when VITE_API_ORIGIN is set. */
export function apiBaseUrl() {
  const o = apiOrigin();
  return o ? `${o}/api` : "/api";
}

/** Absolute or same-origin URL for /health, /uploads, etc. */
export function backendUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const o = apiOrigin();
  return o ? `${o}${p}` : p;
}

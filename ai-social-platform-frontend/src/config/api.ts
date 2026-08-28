export const DEFAULT_BACKEND_PORT = 3002;
export const DEFAULT_BACKEND_URL = `http://localhost:${DEFAULT_BACKEND_PORT}`;

/**
 * Base URL for API requests.
 * In development mode, relative URL ('') is used so Vite proxy forwards /api requests.
 * In production mode, uses VITE_API_URL or defaults to DEFAULT_BACKEND_URL.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Absolute backend URL used for OAuth callbacks, setup instructions, and external references.
 */
export const BACKEND_URL = import.meta.env.VITE_API_URL || '';

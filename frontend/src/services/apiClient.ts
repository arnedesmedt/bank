/**
 * Shared API client utilities for communicating with the Symfony backend.
 *
 * All requests are authenticated with a Bearer token obtained via OAuth2
 * (see AuthContext). Data is imported into the backend via CSV import
 * (see specs/001-csv-import-transfers) before being surfaced through
 * these endpoints.
 */

declare global {
    interface Window {
        __ingress_path__?: string;
    }
}

export const API_URL: string =
    (typeof window !== 'undefined' && window.__ingress_path__)
        ? window.__ingress_path__
        : (import.meta.env.VITE_API_URL ?? '');

/**
 * Perform an authenticated GET request against the bank API.
 * Throws on non-2xx responses.
 */
export async function apiGet<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}


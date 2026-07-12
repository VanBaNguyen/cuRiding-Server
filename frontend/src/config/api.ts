/** Server endpoints — see server/routes.py and API.md on the server branch. */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://curiding2.akramb.com';

export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ?? 'wss://curiding2.akramb.com';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function wsUrl(path: string): string {
  return `${WS_BASE_URL}${path}`;
}

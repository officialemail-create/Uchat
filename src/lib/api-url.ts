const configuredApiUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${configuredApiUrl}/api${path}`;
}

export function storageUrl(objectPath: string): string {
  const normalizedPath = objectPath.replace(/^\/+/, '');
  return apiUrl(`/storage/${normalizedPath}`);
}

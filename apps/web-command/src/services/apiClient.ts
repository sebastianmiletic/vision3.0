const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed for ${path} with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const API_BASE_URL = configuredBaseUrl || '';

export async function getJson<T>(path: string): Promise<T> {
  const requestPath = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(requestPath);
  } catch (firstError) {
    const fallbackPath = path;
    if (API_BASE_URL && fallbackPath !== requestPath) {
      response = await fetch(fallbackPath);
    } else {
      throw firstError;
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed for ${path} with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

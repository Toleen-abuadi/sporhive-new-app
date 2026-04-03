export function createApiClient({ baseUrl, getToken }) {
  async function request(path, options = {}) {
    const token = typeof getToken === 'function' ? await getToken() : null;

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    return response;
  }

  return {
    request,
  };
}

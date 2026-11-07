// Model a browser submitting the server-rendered form rather than bypassing CSRF.
export async function createFormClient(base) {
  const html = await (await fetch(base + '/')).text();
  const token = html.match(/name="csrf_token" value="([a-f0-9]{64})"/)?.[1];
  if (!token) throw new Error('Server form has no CSRF token');
  return (url, options = {}) => {
    if (options.method !== 'POST') return fetch(url, options);
    const body = new URLSearchParams(options.body);
    body.set('csrf_token', token);
    return fetch(url, { ...options, body, headers: {
      'content-type': 'application/x-www-form-urlencoded', ...options.headers
    } });
  };
}

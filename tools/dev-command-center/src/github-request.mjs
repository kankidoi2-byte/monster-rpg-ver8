// The deadline includes receiving the response body, not just its headers.
export async function fetchGitHubText(fetchImpl, url, init = {}, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? (init.method === 'GET' ? 15_000 : 30_000);
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('github_timeout');
      error.code = 'github_timeout';
      reject(error);
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, { ...init, signal: controller.signal });
        const text = response?.ok ? await response.text() : '';
        return { response, text };
      })(),
      deadline
    ]);
  } finally { clearTimeout(timer); }
}

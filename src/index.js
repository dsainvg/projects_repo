export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Attempt to fetch the static asset (e.g. index.html, assets/css/index.css, etc.)
    const response = await env.ASSETS.fetch(request);

    // 2. If the asset was not found (404), rewrite the request to /project.html
    // This serves the project details page while keeping the clean URL in the browser bar
    if (response.status === 404) {
      const rewriteUrl = new URL('/project.html', url.origin);
      const rewrittenRequest = new Request(rewriteUrl, request);
      return env.ASSETS.fetch(rewrittenRequest);
    }

    return response;
  }
};

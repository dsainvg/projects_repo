export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const lowercasePath = url.pathname.toLowerCase();

    // Redirect to lowercase if the path has uppercase letters,
    // but only for clean project URLs (not static assets/data files or file extensions).
    const isAssetOrData = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/');
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);

    if (url.pathname !== lowercasePath && !isAssetOrData && !hasExtension) {
      return Response.redirect(new URL(lowercasePath + url.search, url.origin), 301);
    }

    // 1. Attempt to fetch the static asset (e.g. index.html, assets/css/index.css, etc.)
    const response = await env.ASSETS.fetch(request);

    // 2. If the asset was not found (404), rewrite the request to /project.html
    // This serves the project details page while keeping the clean URL in the browser bar
    if (response.status === 404) {
      const rewriteUrl = new URL('/project', url.origin);
      const rewrittenRequest = new Request(rewriteUrl, request);
      return env.ASSETS.fetch(rewrittenRequest);
    }

    return response;
  }
};

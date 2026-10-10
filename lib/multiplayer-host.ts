type Endpoint = { host: string; protocol: 'ws' | 'wss'; error?: never } | { error: string; host?: never; protocol?: never };

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || /^127\./.test(hostname) || hostname === '[::1]';
}

/** Resolve the build-time public endpoint without sending deployed users to their own localhost. */
export function resolveMultiplayerHost(configured: string | undefined, legacy: string | undefined, page: { hostname: string; protocol: string }): Endpoint {
  const localPage = isLoopback(page.hostname);
  const value = configured?.trim() || legacy?.trim() || (localPage ? 'localhost:1999' : '');
  if (!value) return { error: 'Multiplayer is not configured for this deployment. Set NEXT_PUBLIC_MULTIPLAYER_HOST to the deployed Cloudflare Worker hostname in Vercel, then redeploy.' };
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
    if (!['https:', 'http:', 'wss:', 'ws:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid endpoint');
    const loopback = isLoopback(url.hostname);
    if (!localPage && loopback) return { error: 'Multiplayer is configured to use localhost, which cannot serve online players. Set NEXT_PUBLIC_MULTIPLAYER_HOST to the deployed Cloudflare Worker hostname in Vercel, then redeploy.' };
    return { host: url.host, protocol: loopback && page.protocol === 'http:' ? 'ws' : 'wss' };
  } catch {
    return { error: 'The multiplayer hostname is invalid. Set NEXT_PUBLIC_MULTIPLAYER_HOST to the Cloudflare Worker hostname without a room path, then redeploy.' };
  }
}

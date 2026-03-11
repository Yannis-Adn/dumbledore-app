import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request, Response, NextFunction } from 'express';
import https from 'https';
import http from 'http';

const GANDALF = 'https://gandalf.epitech.eu';
const PANORAMIX = 'https://panoramix.epitest.eu';

const MAX_REDIRECTS = 5;
const ALLOWED_REDIRECT_HOSTS = [
  'gandalf.epitech.eu',
];
const ALLOWED_REDIRECT_PATTERNS = [
  /\.amazonaws\.com$/,
  /\.s3\./,
];

function isAllowedRedirect(hostname: string): boolean {
  if (ALLOWED_REDIRECT_HOSTS.includes(hostname)) return true;
  return ALLOWED_REDIRECT_PATTERNS.some((p) => p.test(hostname));
}

/**
 * Middleware that handles Moodle pluginfile.php downloads server-side.
 * Moodle redirects pluginfile.php to external object storage (S3/etc),
 * which causes CORS errors if the browser follows the redirect directly.
 * This follows redirects on the server and streams the file back.
 */
export function gandalfDownloadProxy(req: Request, res: Response, next: NextFunction) {
  if (!req.url.startsWith('/api/pluginfile.php/')) return next();

  const token = req.headers['x-moodle-session'] as string;
  const targetPath = req.url.replace(/^\/api/, '');
  const targetUrl = `${GANDALF}${targetPath}`;

  const followRedirects = (url: string, depth = 0) => {
    if (depth > MAX_REDIRECTS) {
      res.writeHead(502);
      res.end('Download proxy error');
      return;
    }

    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: token ? { Cookie: `MoodleSession=${token}` } : {},
    }, (upstream) => {
      if ([301, 302, 303, 307, 308].includes(upstream.statusCode!) && upstream.headers.location) {
        upstream.resume();
        try {
          const parsed = new URL(upstream.headers.location, url);
          if (depth > 0 && !isAllowedRedirect(parsed.hostname)) {
            res.writeHead(502);
            res.end('Download proxy error');
            return;
          }
          followRedirects(parsed.toString(), depth + 1);
        } catch {
          res.writeHead(502);
          res.end('Download proxy error');
        }
        return;
      }
      const fwdHeaders: Record<string, string> = {};
      if (upstream.headers['content-type']) fwdHeaders['content-type'] = upstream.headers['content-type'];
      if (upstream.headers['content-disposition']) fwdHeaders['content-disposition'] = upstream.headers['content-disposition'];
      if (upstream.headers['content-length']) fwdHeaders['content-length'] = upstream.headers['content-length'];
      res.writeHead(upstream.statusCode!, fwdHeaders);
      upstream.pipe(res);
    }).on('error', () => {
      res.writeHead(502);
      res.end('Download proxy error');
    });
  };

  followRedirects(targetUrl);
}

/** Proxy for Gandalf (Moodle) — /api/* -> gandalf.epitech.eu/* */
export const gandalfProxy = createProxyMiddleware({
  target: GANDALF,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    proxyReq: (proxyReq, req) => {
      const cookie = (req as Request).headers['x-moodle-session'];
      if (cookie) {
        proxyReq.setHeader('Cookie', `MoodleSession=${cookie}`);
      }
    },
    proxyRes: (proxyRes) => {
      const location = proxyRes.headers['location'];
      if (location && typeof location === 'string') {
        proxyRes.headers['location'] = location.replace(
          /^https?:\/\/gandalf\.epitech\.eu/,
          '/api',
        );
      }
    },
  },
});

/** Proxy for Panoramix — /panoramix-api/* -> panoramix.epitest.eu/api/* */
export const panoramixProxy = createProxyMiddleware({
  target: PANORAMIX,
  changeOrigin: true,
  pathRewrite: { '^/': '/api/' },
  on: {
    proxyReq: (proxyReq, req) => {
      const token = (req as Request).headers['x-panoramix-token'];
      if (token) {
        proxyReq.setHeader('Cookie', `refresh_token=${token}`);
      }
    },
  },
});

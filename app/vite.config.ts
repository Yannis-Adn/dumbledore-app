import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import https from 'https'
import type { Plugin } from 'vite'

/**
 * Vite plugin that handles Moodle pluginfile.php downloads server-side.
 * Moodle redirects pluginfile.php to external object storage (S3/etc),
 * which causes CORS errors if the browser follows the redirect directly.
 * This middleware follows redirects on the server and streams the file back.
 */
function gandalfDownloadProxy(): Plugin {
  return {
    name: 'gandalf-download-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/pluginfile.php/')) return next()

        const token = req.headers['x-moodle-session'] as string
        const targetPath = req.url.replace(/^\/api/, '')
        const targetUrl = `https://gandalf.epitech.eu${targetPath}`

        const followRedirects = (url: string) => {
          const mod = url.startsWith('https') ? https : require('http')
          mod.get(url, {
            headers: token ? { Cookie: `MoodleSession=${token}` } : {},
          }, (upstream: any) => {
            if ([301, 302, 303, 307, 308].includes(upstream.statusCode) && upstream.headers.location) {
              upstream.resume()
              followRedirects(upstream.headers.location)
              return
            }
            // Forward headers that matter for downloads
            const fwdHeaders: Record<string, string> = {}
            if (upstream.headers['content-type']) fwdHeaders['content-type'] = upstream.headers['content-type']
            if (upstream.headers['content-disposition']) fwdHeaders['content-disposition'] = upstream.headers['content-disposition']
            if (upstream.headers['content-length']) fwdHeaders['content-length'] = upstream.headers['content-length']
            res.writeHead(upstream.statusCode, fwdHeaders)
            upstream.pipe(res)
          }).on('error', (err: Error) => {
            res.writeHead(502)
            res.end(`Download proxy error: ${err.message}`)
          })
        }

        followRedirects(targetUrl)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gandalfDownloadProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://gandalf.epitech.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const cookie = req.headers['x-moodle-session']
            if (cookie) {
              proxyReq.setHeader('Cookie', `MoodleSession=${cookie}`)
            }
          })
          // Rewrite redirect Location headers so the browser follows them
          // through the proxy instead of hitting gandalf directly (CORS)
          proxy.on('proxyRes', (proxyRes) => {
            const location = proxyRes.headers['location']
            if (location && typeof location === 'string') {
              proxyRes.headers['location'] = location.replace(
                /^https?:\/\/gandalf\.epitech\.eu/,
                '/api'
              )
            }
          })
        },
      },
      '/panoramix-api': {
        target: 'https://panoramix.epitest.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/panoramix-api/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const token = req.headers['x-panoramix-token']
            if (token) {
              // Panoramix auth: httpOnly cookie named "refresh_token"
              proxyReq.setHeader('Cookie', `refresh_token=${token}`)
            }
          })
        },
      },
    },
  },
})

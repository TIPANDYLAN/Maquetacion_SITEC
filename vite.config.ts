import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

const responderProxyNoDisponible = (
  res: http.ServerResponse | import('node:net').Socket,
  payload: { error: string; details: string }
) => {
  if (!('writeHead' in res) || !('end' in res) || res.writableEnded) {
    return
  }

  res.writeHead(502, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'n8n-get-body-proxy',
      configureServer(server) {
        server.middlewares.use('/api/n8n/get-with-body', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))

          req.on('end', () => {
            try {
              const rawBody = Buffer.concat(chunks).toString('utf8')
              const parsed = rawBody ? JSON.parse(rawBody) : {}
              const endpoint = String(parsed.endpoint || '')
              const payload = parsed.payload ?? {}
              const apiKey = String(parsed.apiKey || '')

              if (!endpoint) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing endpoint' }))
                return
              }

              const targetUrl = new URL(endpoint)
              const body = JSON.stringify(payload)
              const transport = targetUrl.protocol === 'https:' ? https : http

              const proxyReq = transport.request({
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                path: `${targetUrl.pathname}${targetUrl.search}`,
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(body),
                  ...(apiKey ? { 'x-api-key': apiKey } : {}),
                },
                rejectUnauthorized: false,
              }, (proxyRes) => {
                res.statusCode = proxyRes.statusCode || 502
                Object.entries(proxyRes.headers).forEach(([key, value]) => {
                  if (value !== undefined) {
                    res.setHeader(key, value as string | string[])
                  }
                })
                proxyRes.pipe(res)
              })

              proxyReq.on('error', (error) => {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Proxy request failed', details: error.message }))
              })

              proxyReq.write(body)
              proxyReq.end()
            } catch (error) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                error: 'Invalid proxy payload',
                details: error instanceof Error ? error.message : 'Unknown error',
              }))
            }
          })

          req.on('error', () => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to read request body' }))
          })

        })
      },
    },
  ],
  server: {
    proxy: {
      '/api/humana': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_error, _req, res) => {
            responderProxyNoDisponible(res, {
              error: 'Backend de Humana no disponible',
              details: 'Inicia el backend con npm run dev:backend',
            })
          })
        },
      },
      '/api/descuentos': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_error, _req, res) => {
            responderProxyNoDisponible(res, {
              error: 'Backend de descuentos no disponible',
              details: 'Inicia el backend con npm run dev:backend',
            })
          })
        },
      },
      '/api/n8n': {
        target: 'https://n8n.172.10.219.15.sslip.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
        secure: false,
      }
    }
  }
})

import type { Context } from '@netlify/edge-functions'

export default async (_request: Request, context: Context) => {
  const country = context.geo?.country?.code ?? null

  return new Response(JSON.stringify({ country }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

export const config = { path: '/api/geo' }

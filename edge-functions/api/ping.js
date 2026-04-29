/**
 * 诊断端点 — 验证 EdgeOne Pages Edge Function 是否正常工作
 *
 * 访问 https://your-domain.edgeone.dev/api/ping
 * 返回简单 JSON，用于确认边缘函数是否被正确触发
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export function onRequestGet(context) {
  const { request, env, clientIp, geo } = context

  return new Response(JSON.stringify({
    status: 'ok',
    message: 'Edge Function is working',
    time: new Date().toISOString(),
    info: {
      url: request.url,
      method: request.method,
      clientIp: clientIp || 'unknown',
      region: geo?.region || 'unknown',
      country: geo?.country || 'unknown',
    }
  }), {
    status: 200,
    headers: CORS_HEADERS,
  })
}

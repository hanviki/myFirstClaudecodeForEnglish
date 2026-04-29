/**
 * EdgeOne Pages Edge Function — 词典查询代理
 */
export async function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const word = url.searchParams.get('word')

  if (!word) {
    return new Response(JSON.stringify({ error: 'word is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    // 使用 AbortController 实现超时（兼容性更好）
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (!res.ok) {
      return new Response(JSON.stringify({ error: '上游返回异常', status: res.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const data = await res.json()

    // 直接将有道原始数据返回给前端（前端解析）
    return new Response(JSON.stringify({ raw: data, word }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({
      error: '请求异常',
      name: e?.name || typeof e,
      message: e?.message || String(e),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

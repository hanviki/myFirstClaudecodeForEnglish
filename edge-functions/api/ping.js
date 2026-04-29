/**
 * 诊断端点 — 极简版本，测试边缘函数是否可用
 */
export function onRequestGet() {
  return new Response(
    JSON.stringify({ status: 'ok', msg: 'ping 正常' }),
    { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}

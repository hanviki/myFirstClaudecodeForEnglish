/**
 * EdgeOne Pages Edge Function — 词典查询代理（调试模式）
 *
 * 文件路径 edge-functions/api/dict.js → 访问路由 /api/dict
 * 自动部署：推送到 Git 仓库后，EdgeOne Pages 自动构建部署
 *
 * 调试：返回体中包含 _debug 字段，记录每一步的执行状态
 */

const POS_MAP = {
  adj: { en: 'adjective', cn: '形容词' },
  adv: { en: 'adverb', cn: '副词' },
  n:   { en: 'noun', cn: '名词' },
  v:   { en: 'verb', cn: '动词' },
  int: { en: 'interjection', cn: '感叹词' },
  prep:{ en: 'preposition', cn: '介词' },
  conj:{ en: 'conjunction', cn: '连词' },
  pron:{ en: 'pronoun', cn: '代词' },
  num: { en: 'numeral', cn: '数词' },
  art: { en: 'article', cn: '冠词' },
  det: { en: 'determiner', cn: '限定词' },
  comb:{ en: 'combining form', cn: '组合词' },
  pref:{ en: 'prefix', cn: '前缀' },
  suff:{ en: 'suffix', cn: '后缀' },
}

function buildEntry(word, youdaoData) {
  const ec = youdaoData.ec
  if (!ec || !ec.word?.[0]) return null

  const w = ec.word[0]
  const firstCn = w.trs?.[0]?.tr?.[0]?.l?.i?.[0] || ''

  const meanings = []
  for (const tr of w.trs || []) {
    const text = tr.tr?.[0]?.l?.i?.[0] || ''
    if (!text) continue

    const posMatch = text.match(/^(\w+)\.\s*(.*)/)
    const posAbbr = posMatch ? posMatch[1].toLowerCase() : ''
    const posInfo = POS_MAP[posAbbr]
    const defText = posMatch ? posMatch[2] : text
    const defs = defText.split(/[；;]/).map(s => s.trim()).filter(Boolean)
    if (defs.length === 0) defs.push(defText)

    meanings.push({
      partOfSpeech: posInfo?.en || posAbbr || '其他',
      partOfSpeechCn: posInfo?.cn || posAbbr || '',
      definitions: defs.map(d => ({ definition: d })),
    })
  }

  const examples = []
  for (const s of youdaoData.blng_sents_part?.sentence || []) {
    const en = s.sentence?.[0]?.['#text'] || ''
    const cn = s.sentence_translation?.[0]?.['#text'] || ''
    if (en && cn) examples.push({ en, cn })
  }

  return {
    word,
    phonetic: w.usphone || w.ukphone || '',
    phoneticUs: w.usphone || '',
    phoneticUk: w.ukphone || '',
    chinese: firstCn.replace(/^(\w+\.\s*)/, '').split(/[；;]/)[0]?.trim() || firstCn,
    meanings,
    examples,
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'X-Dict-Debug': 'enabled',
}

export function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const word = url.searchParams.get('word')
  const logs = [] // 调试日志
  const startTime = Date.now()

  function log(step, status, detail) {
    const entry = { step, status, time: Date.now() - startTime + 'ms', detail }
    logs.push(entry)
    console.log(`[dict] step=${step} status=${status} detail=${detail}`)
  }

  log('start', 'ok', `request.url=${request.url}`)
  log('parse_url', 'ok', `word=${word}`)

  if (!word) {
    log('validate', 'fail', 'word参数为空')
    return new Response(JSON.stringify({ error: 'word is required', _debug: logs }), {
      status: 400,
      headers: CORS_HEADERS,
    })
  }

  log('validate', 'ok', 'word参数正常')

  const youdaoUrl = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`
  log('fetch_start', 'ok', `目标URL=${youdaoUrl}`)

  return fetch(youdaoUrl, { signal: AbortSignal.timeout(8000) })
    .then(async (res) => {
      log('fetch_response', 'ok', `状态码=${res.status} ${res.statusText}`)

      // 记录响应头（用于诊断）
      const respHeaders = {}
      res.headers.forEach((v, k) => { respHeaders[k] = v })
      log('fetch_headers', 'ok', JSON.stringify(respHeaders))

      if (!res.ok) {
        const body = await res.text().catch(() => '读取body失败')
        log('fetch_not_ok', 'fail', `状态码=${res.status} body=${body.substring(0, 500)}`)
        return new Response(JSON.stringify({
          error: '词典服务暂时不可用',
          _debug: logs,
        }), { status: 502, headers: CORS_HEADERS })
      }

      log('parse_json', 'start', '开始解析响应JSON')
      let data
      try {
        data = await res.json()
        log('parse_json', 'ok', `JSON解析成功，顶层key=${Object.keys(data).join(',')}`)
      } catch (e) {
        log('parse_json', 'fail', `JSON解析失败: ${e.message}`)
        return new Response(JSON.stringify({
          error: '词典响应解析失败',
          _debug: logs,
        }), { status: 502, headers: CORS_HEADERS })
      }

      log('build_entry', 'start', '开始构建词典条目')
      const entry = buildEntry(word, data)

      if (!entry) {
        log('build_entry', 'fail', `ec=${!!data.ec} ec.word=${data.ec?.word?.length ?? 0}`)
        return new Response(JSON.stringify({
          error: `未找到单词 "${word}" 的释义`,
          _debug: logs,
        }), { status: 404, headers: CORS_HEADERS })
      }

      log('build_entry', 'ok', `释义=${entry.chinese} 词义数=${entry.meanings.length} 例句数=${entry.examples.length}`)
      log('complete', 'ok', `总耗时=${Date.now() - startTime}ms`)

      return new Response(JSON.stringify({ data: [entry], _debug: logs }), {
        status: 200,
        headers: CORS_HEADERS,
      })
    })
    .catch((e) => {
      log('catch', 'error', `类型=${e?.name} 消息=${e?.message}`)
      log('complete', 'fail', `总耗时=${Date.now() - startTime}ms`)

      return new Response(JSON.stringify({
        error: '词典服务暂时不可用',
        detail: { name: e?.name, message: e?.message },
        _debug: logs,
      }), {
        status: 502,
        headers: CORS_HEADERS,
      })
    })
}

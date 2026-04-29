/**
 * EdgeOne 边缘函数 — 词典查询代理
 *
 * 部署步骤：
 * 1. 登录 EdgeOne 控制台 → 边缘函数 → 函数管理 → 新建函数
 * 2. 将本文件内容粘贴到代码编辑器，点击"创建并部署"
 * 3. 配置触发规则：匹配类型 URL Path、运算符 等于、值 /api/dict
 *
 * 功能：将前端 /api/dict?word=go 请求转发到有道词典 API
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

async function handleRequest(request) {
  const url = new URL(request.url)
  const word = url.searchParams.get('word')

  if (!word) {
    return new Response(JSON.stringify({ error: 'word is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    const res = await fetch(
      `http://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: '词典服务暂时不可用，请稍后重试' }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const data = await res.json()
    const entry = buildEntry(word, data)

    if (!entry) {
      return new Response(
        JSON.stringify({ error: `未找到单词 "${word}" 的释义` }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    return new Response(JSON.stringify([entry]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    const status = e?.name === 'TimeoutError' ? 504 : 500
    const msg = status === 504
      ? '词典服务响应超时，请稍后重试'
      : '词典服务暂时不可用，请稍后重试'
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/** 词性缩写 → 英文全称 → 中文 */
const POS_MAP: Record<string, { en: string; cn: string }> = {
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

interface DictEntry {
  word: string
  phonetic?: string
  phoneticUs?: string
  phoneticUk?: string
  chinese: string
  meanings: Array<{
    partOfSpeech: string
    partOfSpeechCn: string
    definitions: Array<{ definition: string }>
  }>
  examples: Array<{ en: string; cn: string }>
}

export async function onRequest(context: any) {
  const url = new URL(context.request.url)
  const word = url.searchParams.get('word')

  if (!word) {
    return new Response(JSON.stringify({ error: 'word is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
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
    const ec = data.ec

    if (!ec || !ec.word?.[0]) {
      return new Response(
        JSON.stringify({ error: `未找到单词 "${word}" 的释义` }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const w = ec.word[0]
    const firstCn = w.trs?.[0]?.tr?.[0]?.l?.i?.[0] || ''

    // 构建 meanings
    const meanings: DictEntry['meanings'] = []
    for (const tr of w.trs || []) {
      const text: string = tr.tr?.[0]?.l?.i?.[0] || ''
      if (!text) continue

      // 提取词性缩写 (如 "adj." "n." "int.")
      const posMatch = text.match(/^(\w+)\.\s*(.*)/)
      const posAbbr = posMatch ? posMatch[1].toLowerCase() : ''
      const posInfo = POS_MAP[posAbbr]
      const defText = posMatch ? posMatch[2] : text

      // 按中文分号拆分多个义项
      const defs = defText.split(/[；;]/).map(s => s.trim()).filter(Boolean)
      if (defs.length === 0) defs.push(defText)

      meanings.push({
        partOfSpeech: posInfo?.en || posAbbr || '其他',
        partOfSpeechCn: posInfo?.cn || posAbbr || '',
        definitions: defs.map(d => ({ definition: d })),
      })
    }

    // 提取双语例句
    const examples: DictEntry['examples'] = []
    for (const s of data.blng_sents_part?.sentence || []) {
      const en = s.sentence?.[0]?.['#text'] || ''
      const cn = s.sentence_translation?.[0]?.['#text'] || ''
      if (en && cn) examples.push({ en, cn })
    }

    const entry: DictEntry = {
      word,
      phonetic: w.usphone || w.ukphone || '',
      phoneticUs: w.usphone || '',
      phoneticUk: w.ukphone || '',
      chinese: firstCn.replace(/^(\w+\.\s*)/, '').split(/[；;]/)[0]?.trim() || firstCn,
      meanings,
      examples,
    }

    return new Response(JSON.stringify([entry]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (e: any) {
    if (e?.name === 'TimeoutError') {
      return new Response(
        JSON.stringify({ error: '词典服务响应超时，请稍后重试' }),
        { status: 504, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }
    return new Response(
      JSON.stringify({ error: '词典服务暂时不可用，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
}

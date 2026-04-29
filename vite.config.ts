import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

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
}

/** 开发环境下替代 EdgeOne 边缘函数处理 /api/dict 请求 */
function dictDevPlugin(): Plugin {
  return {
    name: 'dict-dev',
    configureServer(server) {
      server.middlewares.use('/api/dict', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost')
        const word = url.searchParams.get('word')

        if (!word) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'word is required' }))
          return
        }

        try {
          const apiRes = await fetch(
            `http://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
            { signal: AbortSignal.timeout(8000) }
          )

          if (!apiRes.ok) {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ error: '词典服务暂时不可用，请稍后重试' }))
            return
          }

          const data = await apiRes.json()
          const ec = data.ec

          if (!ec || !ec.word?.[0]) {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ error: `未找到单词 "${word}" 的释义` }))
            return
          }

          const w = ec.word[0]
          const firstCn = w.trs?.[0]?.tr?.[0]?.l?.i?.[0] || ''

          const meanings: any[] = []
          for (const tr of w.trs || []) {
            const text: string = tr.tr?.[0]?.l?.i?.[0] || ''
            if (!text) continue
            const posMatch = text.match(/^(\w+)\.\s*(.*)/)
            const posAbbr = posMatch ? posMatch[1].toLowerCase() : ''
            const posInfo = POS_MAP[posAbbr]
            const defText = posMatch ? posMatch[2] : text
            const defs = defText.split(/[；;]/).map((s: string) => s.trim()).filter(Boolean)
            if (defs.length === 0) defs.push(defText)
            meanings.push({
              partOfSpeech: posInfo?.en || posAbbr || '其他',
              partOfSpeechCn: posInfo?.cn || posAbbr || '',
              definitions: defs.map((d: string) => ({ definition: d })),
            })
          }

          const examples: any[] = []
          for (const s of data.blng_sents_part?.sentence || []) {
            const en = s.sentence?.[0]?.['#text'] || ''
            const cn = s.sentence_translation?.[0]?.['#text'] || ''
            if (en && cn) examples.push({ en, cn })
          }

          const entry = {
            word,
            phonetic: w.usphone || w.ukphone || '',
            phoneticUs: w.usphone || '',
            phoneticUk: w.ukphone || '',
            chinese: firstCn.replace(/^(\w+\.\s*)/, '').split(/[；;]/)[0]?.trim() || firstCn,
            meanings,
            examples,
          }

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify([entry]))
        } catch (e: any) {
          const status = e?.name === 'TimeoutError' ? 504 : 500
          const msg = status === 504 ? '词典服务响应超时，请稍后重试' : '词典服务暂时不可用，请稍后重试'
          res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ error: msg }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), dictDevPlugin()],
})

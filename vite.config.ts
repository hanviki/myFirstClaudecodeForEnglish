import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** 开发环境下替代 Cloudflare Function 处理 /node-functions/dict 请求 */
function dictDevPlugin(): Plugin {
  return {
    name: 'dict-dev',
    configureServer(server) {
      server.middlewares.use('/node-functions/dict', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost')
        const word = url.searchParams.get('word')

        if (!word) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'word is required' }))
          return
        }

        /** 获取中文翻译 */
        const translate = async (text: string): Promise<string> => {
          try {
            const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`)
            if (!r.ok) return ''
            const d = await r.json() as { responseData?: { translatedText?: string } }
            return d?.responseData?.translatedText || ''
          } catch { return '' }
        }

        // 并行请求英文释义和单词翻译
        const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)

        if (dictRes.status === 404) {
          const chinese = await translate(word)
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ error: `未找到单词 "${word}" 的释义`, chinese }))
          return
        }

        if (!dictRes.ok) {
          res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ error: `词典服务响应异常（${dictRes.status}）` }))
          return
        }

        const data = await dictRes.json()
        const entries: any[] = Array.isArray(data) ? data : [data]

        // 收集所有待翻译文本（定义 + 例句），批量翻译
        const textsToTranslate: string[] = [word]
        for (const entry of entries) {
          for (const meaning of entry.meanings || []) {
            for (const def of meaning.definitions || []) {
              textsToTranslate.push(def.definition)
              if (def.example) textsToTranslate.push(def.example)
            }
          }
        }
        const translatedTexts = await Promise.all(
          textsToTranslate.map(t => translate(t))
        )

        // 回填翻译
        let idx = 0
        for (const entry of entries) {
          entry.chinese = translatedTexts[idx++] || ''
          for (const meaning of entry.meanings || []) {
            for (const def of meaning.definitions || []) {
              def.definitionCn = translatedTexts[idx++] || ''
              if (def.example) def.exampleCn = translatedTexts[idx++] || ''
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify(entries))
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), dictDevPlugin()],
})

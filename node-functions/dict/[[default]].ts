interface DictDefinition {
  definition: string
  example?: string
}

interface DictMeaning {
  partOfSpeech: string
  definitions: DictDefinition[]
}

interface DictEntry {
  word: string
  phonetic?: string
  meanings: DictMeaning[]
}

/** 使用 MyMemory API 获取中文翻译 */
async function fetchTranslation(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`
    const res = await fetch(url)
    if (!res.ok) return ''
    const data = await res.json() as { responseData?: { translatedText?: string } }
    return data?.responseData?.translatedText || ''
  } catch {
    return ''
  }
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
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    const [dictRes, wordCn] = await Promise.all([
      fetch(apiUrl),
      fetchTranslation(word)
    ])

    if (dictRes.status === 404) {
      return new Response(
        JSON.stringify({ error: `未找到单词 "${word}" 的释义`, chinese: wordCn }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    if (!dictRes.ok) {
      return new Response(
        JSON.stringify({ error: `词典服务响应异常（${dictRes.status}）` }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    const data = await dictRes.json()
    const entries: any[] = Array.isArray(data) ? data : [data]

    // 收集所有待翻译文本（定义 + 例句），批量翻译
    const textsToTranslate: string[] = []
    for (const entry of entries) {
      for (const meaning of entry.meanings || []) {
        for (const def of meaning.definitions || []) {
          textsToTranslate.push(def.definition)
          if (def.example) textsToTranslate.push(def.example)
        }
      }
    }
    const translatedTexts = await Promise.all(
      textsToTranslate.map(t => fetchTranslation(t))
    )

    // 将翻译结果回填到数据中
    let idx = 0
    for (const entry of entries) {
      entry.chinese = wordCn
      for (const meaning of entry.meanings || []) {
        for (const def of meaning.definitions || []) {
          def.definitionCn = translatedTexts[idx++] || ''
          if (def.example) def.exampleCn = translatedTexts[idx++] || ''
        }
      }
    }

    return new Response(JSON.stringify(entries), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: '词典服务暂时不可用，请稍后重试' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}

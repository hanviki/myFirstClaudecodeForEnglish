// 有道词典 API 返回结构（关键字段）
interface YoudaoTr {
  l?: { i?: Array<{ str?: string }> }
}

interface YoudaoTrs {
  tr?: YoudaoTr[]
  pos?: string
}

interface YoudaoWord {
  trs?: YoudaoTrs[]
  phone?: string
  ue?: string  // 美式音标
  uk?: string  // 英式音标
}

interface YoudaoEc {
  word?: YoudaoWord[]
}

interface YoudaoResponse {
  ec?: YoudaoEc
}

// 前端期望的统一格式
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

/**
 * 将有道词典返回结构转换为前端期望的 DictEntry[] 格式
 */
function transformYoudaoResponse(word: string, data: YoudaoResponse): DictEntry[] {
  const ecWord = data?.ec?.word?.[0]
  if (!ecWord) return []

  // 优先取美式音标，再取英式，最后取 phone 字段
  const phonetic = ecWord.ue || ecWord.uk || ecWord.phone || ''

  // 按词性分组：有道的 trs 每条都带 pos 字段
  const meaningMap = new Map<string, DictDefinition[]>()

  for (const trsItem of ecWord.trs ?? []) {
    const pos = trsItem.pos?.trim() || 'general'
    // 提取翻译文本
    const defTexts: string[] = []
    for (const tr of trsItem.tr ?? []) {
      for (const item of tr.l?.i ?? []) {
        if (item.str?.trim()) defTexts.push(item.str.trim())
      }
    }
    if (defTexts.length === 0) continue

    const definition = defTexts.join('；')
    if (!meaningMap.has(pos)) meaningMap.set(pos, [])
    meaningMap.get(pos)!.push({ definition })
  }

  // 若没有解析到任何词义，返回空
  if (meaningMap.size === 0) return []

  const meanings: DictMeaning[] = []
  for (const [partOfSpeech, definitions] of meaningMap) {
    meanings.push({ partOfSpeech, definitions })
  }

  return [{ word, phonetic, meanings }]
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
    const apiUrl = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&doctype=json`
    const res = await fetch(apiUrl)

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `词典服务响应异常（${res.status}）` }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    const data: YoudaoResponse = await res.json()
    const entries = transformYoudaoResponse(word, data)

    if (entries.length === 0) {
      return new Response(
        JSON.stringify({ error: `未找到单词 "${word}" 的释义` }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
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

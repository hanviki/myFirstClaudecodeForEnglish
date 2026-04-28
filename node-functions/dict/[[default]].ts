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
    const res = await fetch(apiUrl)

    if (res.status === 404) {
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

    const data = await res.json()
    // Free Dictionary API 返回结构与前端 DictEntry[] 天然对齐，直接透传
    return new Response(JSON.stringify(data), {
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

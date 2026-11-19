import { useState } from 'react'
import WordDetailModal from './WordDetailModal'
import type { DictEntry } from './WordDetailModal'
import { tokenize } from '../utils/tokenize'

interface WordTokensProps {
  text: string
  /** 高亮正在朗读的单词(token 索引),用于全文逐词朗读高亮 */
  highlightIndex?: number
}

/**
 * 模块 B 的拆词组件(被文本处理与音频点读复用):
 * 把一段英文拆成可点击的单词,点击单词 → 拉取词典(Free Dictionary + MyMemory)→ 弹出释义弹窗。
 */
export default function WordTokens({ text, highlightIndex = -1 }: WordTokensProps) {
  const [modalEntries, setModalEntries] = useState<DictEntry[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loadingWord, setLoadingWord] = useState('')
  const [fetchError, setFetchError] = useState('')

  /** 点击单词:从 Free Dictionary API 获取英文释义 + 从 MyMemory 获取中英文翻译 */
  async function handleWordClick(word: string) {
    setFetchError('')
    setLoadingWord(word)
    setModalOpen(false)

    try {
      const dictRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      )
      if (!dictRes.ok) {
        setFetchError(`未找到单词 "${word}" 的释义`)
        setLoadingWord('')
        return
      }

      const dictData = await dictRes.json()
      const entry = dictData[0]
      const phonetic = entry.phonetics?.find((p: any) => p.text)?.text || ''

      // 收集需要翻译的文本(释义 + 例句)
      const translateTexts: string[] = []
      for (const m of entry.meanings || []) {
        for (const d of m.definitions || []) {
          if (d.definition && !translateTexts.includes(d.definition)) {
            translateTexts.push(d.definition)
          }
          if (d.example && !translateTexts.includes(d.example)) {
            translateTexts.push(d.example)
          }
        }
      }

      // 并行翻译所有文本
      const transMap = new Map<string, string>()
      if (translateTexts.length > 0) {
        const batchRes = await Promise.allSettled(
          translateTexts.map(text =>
            fetch(
              `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`
            ).then(r => r.json())
          )
        )
        batchRes.forEach((res, i) => {
          if (res.status === 'fulfilled') {
            const t = res.value?.responseData?.translatedText
            if (t) transMap.set(translateTexts[i], t)
          }
        })
      }

      const result: DictEntry = {
        word: entry.word,
        phonetic,
        meanings: (entry.meanings || []).map((m: any) => ({
          partOfSpeech: m.partOfSpeech || '',
          definitions: (m.definitions || []).map((d: any) => ({
            definition: d.definition,
            example: d.example || undefined,
            definitionCn: transMap.get(d.definition) || undefined,
            exampleCn: d.example ? (transMap.get(d.example) || undefined) : undefined,
          })),
        })),
      }

      setModalEntries([result])
      setModalOpen(true)
    } catch (e: any) {
      setFetchError(`请求异常: ${e?.message || '未知错误'}`)
    } finally {
      setLoadingWord('')
    }
  }

  return (
    <>
      {tokenize(text).map((token, i) =>
        token.isWord ? (
          <span
            key={i}
            className={[
              'word-token',
              loadingWord === token.value.toLowerCase() ? 'word-token--loading' : '',
              highlightIndex === i ? 'speaking' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => handleWordClick(token.value.toLowerCase())}
            title="点击查看释义"
          >
            {token.value}
          </span>
        ) : (
          <span key={i} className="word-punct">
            {token.value}
          </span>
        )
      )}
      {fetchError && <p className="tp-error">{fetchError}</p>}
      {modalOpen && (
        <WordDetailModal entries={modalEntries} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}

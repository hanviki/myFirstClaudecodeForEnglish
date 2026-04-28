import { useState } from 'react'
import { useSpeak } from '../hooks/useSpeak'
import WordDetailModal from './WordDetailModal'
import type { DictEntry } from './WordDetailModal'

// 将文本拆分为 token 数组，纯字母单词标记为 word 类型
function tokenize(text: string): Array<{ value: string; isWord: boolean }> {
  // 按"连续字母"和"非连续字母"分段
  const parts = text.split(/([A-Za-z]+)/)
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({ value: p, isWord: /^[A-Za-z]+$/.test(p) }))
}

export default function TextProcessor() {
  const [inputText, setInputText] = useState('')
  const [tokens, setTokens] = useState<Array<{ value: string; isWord: boolean }>>([])
  const [processed, setProcessed] = useState(false)

  // 弹窗状态
  const [modalEntries, setModalEntries] = useState<DictEntry[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loadingWord, setLoadingWord] = useState('')
  const [fetchError, setFetchError] = useState('')

  const { speak } = useSpeak()

  function handleProcess() {
    const text = inputText.trim()
    if (!text) return
    setTokens(tokenize(text))
    setProcessed(true)
    setFetchError('')
  }

  function handleSpeakAll() {
    const text = inputText.trim()
    if (text) speak(text)
  }

  async function handleWordClick(word: string) {
    setFetchError('')
    setLoadingWord(word)
    setModalOpen(false)
    try {
      const res = await fetch(`/node-functions/dict?word=${encodeURIComponent(word)}`)
      if (!res.ok) {
        // 404 表示单词未找到
        if (res.status === 404) {
          setFetchError(`未找到单词 "${word}" 的释义`)
        } else {
          setFetchError('查询失败，请稍后重试')
        }
        setLoadingWord('')
        return
      }
      const data: DictEntry[] = await res.json()
      setModalEntries(data)
      setModalOpen(true)
    } catch {
      setFetchError('网络错误，请检查连接')
    } finally {
      setLoadingWord('')
    }
  }

  return (
    <div className="text-processor">
      <div className="tp-input-area">
        <textarea
          className="tp-textarea"
          rows={5}
          placeholder="请输入英文文本，点击处理后可点击单词查看释义…"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value)
            setProcessed(false)
            setFetchError('')
          }}
        />
        <div className="tp-actions">
          <button className="tp-btn tp-btn-primary" onClick={handleProcess}>
            处理
          </button>
          <button
            className="tp-btn tp-btn-secondary"
            onClick={handleSpeakAll}
            disabled={!inputText.trim()}
          >
            🔊 朗读全文
          </button>
        </div>
      </div>

      {fetchError && <p className="tp-error">{fetchError}</p>}

      {processed && tokens.length > 0 && (
        <div className="tp-output">
          {tokens.map((token, i) =>
            token.isWord ? (
              <span
                key={i}
                className={`word-token${loadingWord === token.value.toLowerCase() ? ' word-token--loading' : ''}`}
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
        </div>
      )}

      {modalOpen && (
        <WordDetailModal
          entries={modalEntries}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

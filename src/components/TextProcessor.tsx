import { useState, useRef } from 'react'
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

  // 朗读全文逐词高亮：highlightIndex 为当前高亮的 token 索引，-1 表示无高亮
  const [highlightIndex, setHighlightIndex] = useState(-1)
  // 用于停止朗读的标志位
  const speakingRef = useRef(false)

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
    if (!text) return

    // 若已在朗读，先停止
    if (speakingRef.current) {
      speakingRef.current = false
      window.speechSynthesis.cancel()
      setHighlightIndex(-1)
      return
    }

    // 提取当前 tokens 中所有纯字母单词及其索引
    const wordIndices: Array<{ index: number; value: string }> = []
    const currentTokens = tokenize(text)
    currentTokens.forEach((token, i) => {
      if (token.isWord) wordIndices.push({ index: i, value: token.value })
    })

    if (wordIndices.length === 0) {
      speak(text)
      return
    }

    speakingRef.current = true

    // 取消可能存在的上一次朗读
    window.speechSynthesis.cancel()

    let cursor = 0

    function speakNext() {
      // 停止标志或已读完所有单词
      if (!speakingRef.current || cursor >= wordIndices.length) {
        speakingRef.current = false
        setHighlightIndex(-1)
        return
      }

      const { index, value } = wordIndices[cursor]
      setHighlightIndex(index)

      const utterance = new SpeechSynthesisUtterance(value)
      utterance.lang = 'en-US'
      utterance.onend = () => {
        cursor++
        speakNext()
      }
      utterance.onerror = () => {
        cursor++
        speakNext()
      }
      window.speechSynthesis.speak(utterance)
    }

    speakNext()
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

  // 判断朗读全文是否正在进行（用于按钮文案）
  const isSpeakingAll = speakingRef.current

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
            // 输入变更时停止朗读
            if (speakingRef.current) {
              speakingRef.current = false
              window.speechSynthesis.cancel()
              setHighlightIndex(-1)
            }
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
            {isSpeakingAll ? '⏹ 停止朗读' : '🔊 朗读全文'}
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

import { useState, useRef } from 'react'
import { useSpeak } from '../hooks/useSpeak'
import WordDetailModal from './WordDetailModal'
import type { DictEntry } from './WordDetailModal'

type SpeakMode = 'idle' | 'normal' | 'slow' | 'loop'

function tokenize(text: string): Array<{ value: string; isWord: boolean }> {
  const parts = text.split(/([A-Za-z]+)/)
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({ value: p, isWord: /^[A-Za-z]+$/.test(p) }))
}

export default function TextProcessor() {
  const [inputText, setInputText] = useState('')
  const [tokens, setTokens] = useState<Array<{ value: string; isWord: boolean }>>([])
  const [processed, setProcessed] = useState(false)

  const [modalEntries, setModalEntries] = useState<DictEntry[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loadingWord, setLoadingWord] = useState('')
  const [fetchError, setFetchError] = useState('')

  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [speakMode, setSpeakMode] = useState<SpeakMode>('idle')

  const speakingRef = useRef(false)
  const loopRef = useRef(false)

  const { speak } = useSpeak()

  function handleProcess() {
    const text = inputText.trim()
    if (!text) return
    setTokens(tokenize(text))
    setProcessed(true)
    setFetchError('')
  }

  function stopAll() {
    speakingRef.current = false
    loopRef.current = false
    window.speechSynthesis.cancel()
    setHighlightIndex(-1)
    setSpeakMode('idle')
  }

  function startSpeak(rate: number, loop: boolean) {
    const text = inputText.trim()
    if (!text) return

    stopAll()

    const wordIndices: Array<{ index: number; value: string }> = []
    const currentTokens = tokenize(text)
    currentTokens.forEach((token, i) => {
      if (token.isWord) wordIndices.push({ index: i, value: token.value })
    })

    if (wordIndices.length === 0) {
      speak(text, rate)
      return
    }

    speakingRef.current = true
    loopRef.current = loop
    setSpeakMode(loop ? 'loop' : rate <= 0.8 ? 'slow' : 'normal')

    let cursor = 0

    function speakNext() {
      if (!speakingRef.current) return

      if (cursor >= wordIndices.length) {
        if (loopRef.current && speakingRef.current) {
          cursor = 0
          speakNext()
        } else {
          stopAll()
        }
        return
      }

      const { index, value } = wordIndices[cursor]
      setHighlightIndex(index)

      const utterance = new SpeechSynthesisUtterance(value)
      utterance.lang = 'en-US'
      utterance.rate = rate
      utterance.onend = () => {
        cursor++
        speakNext()
      }
      utterance.onerror = () => {
        if (!speakingRef.current) return
        cursor++
        speakNext()
      }
      window.speechSynthesis.speak(utterance)
    }

    speakNext()
  }

  function handleSpeakAll() {
    if (speakMode === 'normal') {
      stopAll()
    } else {
      startSpeak(0.85, false)
    }
  }

  function handleSpeakSlow() {
    if (speakMode === 'slow') {
      stopAll()
    } else {
      stopAll()
      setSpeakMode('slow')
      speakingRef.current = true
      const text = inputText.trim()
      if (text) {
        speak(text, 0.8, () => {
          // 慢速朗读结束，自动回到 idle
          if (speakingRef.current) stopAll()
        })
      }
    }
  }

  function handleSpeakLoop() {
    if (speakMode === 'loop') {
      stopAll()
    } else {
      stopAll()
      loopRef.current = true
      setSpeakMode('loop')
      speakingRef.current = true
      const text = inputText.trim()
      if (text) {
        function loopSpeak() {
          speak(text, 0.85, () => {
            if (loopRef.current && speakingRef.current) {
              loopSpeak()
            } else {
              stopAll()
            }
          })
        }
        loopSpeak()
      }
    }
  }

  async function handleWordClick(word: string) {
    setFetchError('')
    setLoadingWord(word)
    setModalOpen(false)
    try {
      const res = await fetch(`/node-functions/dict?word=${encodeURIComponent(word)}`)
      if (!res.ok) {
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
      setFetchError('查询失败，请稍后重试')
    } finally {
      setLoadingWord('')
    }
  }

  const canSpeak = !!inputText.trim()

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
            if (speakingRef.current) stopAll()
          }}
        />
        <div className="tp-actions">
          <button className="tp-btn tp-btn-primary" onClick={handleProcess}>
            处理
          </button>
          <button
            className={['tp-btn tp-btn-secondary', speakMode === 'normal' ? 'tp-btn-active' : ''].filter(Boolean).join(' ')}
            onClick={handleSpeakAll}
            disabled={!canSpeak}
          >
            {speakMode === 'normal' ? '⏹ 停止朗读' : '🔊 朗读全文'}
          </button>
          <button
            className={['tp-btn tp-btn-secondary', speakMode === 'slow' ? 'tp-btn-active' : ''].filter(Boolean).join(' ')}
            onClick={handleSpeakSlow}
            disabled={!canSpeak}
          >
            {speakMode === 'slow' ? '⏹ 停止朗读' : '🐢 慢速朗读'}
          </button>
          <button
            className={['tp-btn tp-btn-secondary', speakMode === 'loop' ? 'tp-btn-active' : ''].filter(Boolean).join(' ')}
            onClick={handleSpeakLoop}
            disabled={!canSpeak}
          >
            {speakMode === 'loop' ? '⏹ 停止循环' : '🔁 循环朗读'}
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

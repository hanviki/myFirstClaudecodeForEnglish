import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import WordTokens from './WordTokens'

// ---------- 类型 ----------
/** 后端返回的单句片段结构 */
interface Sentence {
  text: string
  start: number
  end: number
}

/** 页面所处阶段 */
type Status = 'idle' | 'loading' | 'ready' | 'error'

/** 后端解析接口地址(跨域问题由 Python 端处理) */
const API_URL = 'http://127.0.0.1:8000/process-audio'

/**
 * 模块 C —— 音频上传与点读(类似 EchoFlow)
 * 1. 上传 .mp3 → 调后端解析出句子片段
 * 2. 句子列表点读:点击某句播放,到该句 end 自动暂停
 * 3. 句子文本复用模块 B 的拆词组件(单词可点击查释义)
 */
export default function AudioProcessor() {
  // ---------- 状态设计 ----------
  const [sentences, setSentences] = useState<Sentence[]>([])                 // 解析出的句子列表
  const [audioUrl, setAudioUrl] = useState<string>('')                       // 本地音频 Object URL
  const [fileName, setFileName] = useState('')                               // 文件名(展示用)
  const [status, setStatus] = useState<Status>('idle')                       // 上传/解析阶段
  const [error, setError] = useState('')                                     // 错误信息
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)      // 当前播放句索引(UI 高亮)

  const audioRef = useRef<HTMLAudioElement | null>(null)                     // 隐藏 <audio> 元素引用
  const activeEndRef = useRef(0)                                             // 当前句子的 end(timeupdate 判停用)
  const activeIndexRef = useRef<number | null>(null)                         // 互斥:当前正在播的句子索引
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 释放上一次的 Object URL,避免内存泄漏
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // ---------- 音频播放控制(互斥逻辑) ----------
  /** 切断当前播放,复位状态 */
  function stopPlayback() {
    audioRef.current?.pause()
    activeIndexRef.current = null
    setPlayingIndex(null)
  }

  /** 播放指定句:先切断上一句,再从头播放本句 */
  function playSentence(index: number) {
    const audio = audioRef.current
    const seg = sentences[index]
    if (!audio || !seg) return

    // 互斥:无论之前哪句在播,先切断
    audio.pause()
    audio.currentTime = seg.start
    activeIndexRef.current = index
    activeEndRef.current = seg.end
    setPlayingIndex(index)

    audio.play().catch(() => {
      // 自动播放被浏览器拦截等情况,回滚高亮
      activeIndexRef.current = null
      setPlayingIndex(null)
    })
  }

  /** 点 D 按钮:已播放本句则停止,否则播放 */
  function handlePlay(index: number) {
    if (activeIndexRef.current === index) {
      stopPlayback()
      return
    }
    playSentence(index)
  }

  /** 播放进度监听:到达该句 end 时自动暂停 */
  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio || activeIndexRef.current === null) return
    if (audio.currentTime >= activeEndRef.current) {
      stopPlayback()
    }
  }

  /** 音频自然播完(最后一句 end 之后)兜底复位 */
  function handleAudioEnded() {
    stopPlayback()
  }

  // ---------- 上传 & 解析 ----------
  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 仅允许 .mp3
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setError('仅支持上传 .mp3 文件')
      setStatus('error')
      return
    }

    stopPlayback() // 切换文件前先停止当前播放

    // 释放旧 URL,为新文件创建 Object URL(供本地预览播放)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    const url = URL.createObjectURL(file)

    setAudioUrl(url)
    setFileName(file.name)
    setSentences([])
    setPlayingIndex(null)
    setError('')
    setStatus('loading')

    // FormData 上传,字段名为 file
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(API_URL, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code !== 200) {
        throw new Error(json?.message || `接口返回 code=${json.code}`)
      }
      setSentences(Array.isArray(json.data) ? json.data : [])
      setStatus('ready')
    } catch (err: any) {
      setError(`解析失败：${err?.message || '未知错误'}`)
      setStatus('error')
    }
  }

  return (
    <div className="audio-processor">
      {/* 上传区 */}
      <div className="ap-upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleFileChange}
          hidden
        />
        <button className="tp-btn tp-btn-primary" onClick={() => fileInputRef.current?.click()}>
          🎵 上传 MP3 音频
        </button>
        {fileName && <span className="ap-file-name">{fileName}</span>}
      </div>

      {/* Loading 状态 */}
      {status === 'loading' && <p className="ap-status">⏳ 正在解析音频…</p>}
      {error && <p className="tp-error">{error}</p>}

      {/* 隐藏的 audio 标签:src 绑定本地 Object URL */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {/* 句子列表 & 点读 */}
      {status === 'ready' && sentences.length > 0 && (
        <ul className="ap-sentence-list">
          {sentences.map((s, i) => (
            <li
              key={i}
              className={`ap-sentence-row${playingIndex === i ? ' ap-sentence-row--active' : ''}`}
            >
              {/* D 按钮:播放本句 */}
              <button
                className="ap-play-btn"
                onClick={() => handlePlay(i)}
                title="点击播放本句"
              >
                {playingIndex === i ? '⏸' : '▶'}
              </button>
              {/* 这里引入模块 B 的拆词组件:把句子文本拆成可点击的单词,点击弹出释义 */}
              <div className="ap-sentence-text">
                <WordTokens text={s.text} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === 'ready' && sentences.length === 0 && (
        <p className="ap-status">未解析到任何句子。</p>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import WordTokens from './WordTokens'
import { saveRecord, getAllRecords, deleteRecord, getGrammarCache, saveGrammarCache } from '../utils/db'
import type { AudioRecord, GrammarAnalysis } from '../utils/db'
import GrammarModal from './GrammarModal' 

// ---------- 类型 ----------
interface Sentence {
  text: string
  start: number
  end: number
}

type Status = 'idle' | 'loading' | 'ready' | 'error'
const API_URL = 'http://127.0.0.1:8000/process-audio'

export default function AudioProcessor() {
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)

  // D 弹窗相关状态
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [grammarData, setGrammarData] = useState<GrammarAnalysis | null>(null)

  // 历史记录列表状态
  const [historyList, setHistoryList] = useState<AudioRecord[]>([])
  const [currentRecordId, setCurrentRecordId] = useState<number | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const activeEndRef = useRef(0)
  const activeIndexRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const records = await getAllRecords()
      setHistoryList(records)
    } catch (err) {
      console.error('读取历史记录失败', err)
    }
  }

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // ---------- 音频播放控制 ----------
  function stopPlayback() {
    audioRef.current?.pause()
    activeIndexRef.current = null
    setPlayingIndex(null)
  }

  function playSentence(index: number, rate: number = 1) {
    const audio = audioRef.current
    const seg = sentences[index]
    if (!audio || !seg) return

    audio.pause()
    // 💡 设置播放速率
    audio.playbackRate = rate; 
    
    audio.currentTime = seg.start
    activeIndexRef.current = index
    activeEndRef.current = seg.end
    setPlayingIndex(index)

    audio.play().catch(() => {
      activeIndexRef.current = null
      setPlayingIndex(null)
    })
  }

    function handlePlay(index: number) {
    if (activeIndexRef.current === index) {
      stopPlayback()
      return
    }
    playSentence(index, 1) // 💡 默认原速
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio || activeIndexRef.current === null) return
    if (audio.currentTime >= activeEndRef.current) {
      stopPlayback()
    }
  }

  function handleAudioEnded() {
    stopPlayback()
  }

  // ---------- 上传 & 解析 ----------
  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setError('仅支持上传 .mp3 文件')
      setStatus('error')
      return
    }

    stopPlayback()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    setFileName(file.name)
    setSentences([])
    setPlayingIndex(null)
    setError('')
    setStatus('loading')
    setCurrentRecordId(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(API_URL, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code !== 200) throw new Error(json?.message || `接口返回 code=${json.code}`)
      
      const parsedSentences = Array.isArray(json.data) ? json.data : []
      setSentences(parsedSentences)
      setStatus('ready')

      const newRecord = await saveRecord(file.name, parsedSentences, file)
      setCurrentRecordId(newRecord.id)
      loadHistory()

    } catch (err: any) {
      setError(`解析失败：${err?.message || '未知错误'}`)
      setStatus('error')
    }
  }

  // 点击 D 按钮的分析逻辑
  async function handleAnalyze(text: string) {
    setIsModalOpen(true)
    setGrammarData(null)

    // 1. 先查本地缓存
    const cached = await getGrammarCache(text)
    if (cached) {
      setGrammarData(cached)
      return
    }

    // 2. 没缓存，去请求 Python 后端
    setIsAnalyzing(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/analyze-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: text })
      })
      const json = await res.json()
      if (json.code === 200) {
        setGrammarData(json.data)
        await saveGrammarCache(json.data)
      } else {
        alert('解析失败：' + json.message)
      }
    } catch (err) {
      alert('请求大模型接口失败，请检查后端是否启动')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 点击历史记录列表中的某一项
  function handleSelectHistory(record: AudioRecord) {
    stopPlayback()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    
    const url = URL.createObjectURL(record.audioBlob)
    setAudioUrl(url)
    setFileName(record.fileName)
    setSentences(record.sentences)
    setStatus('ready')
    setCurrentRecordId(record.id)
  }

  // 删除历史记录
  async function handleDeleteHistory(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    if (!confirm('确定要删除这条记录吗？')) return

    await deleteRecord(id)
    loadHistory()

    if (currentRecordId === id) {
      stopPlayback()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
      setFileName('')
      setSentences([])
      setStatus('idle')
      setCurrentRecordId(null)
    }
  }

  return (
    <div className="audio-processor" style={{ display: 'flex', gap: '20px' }}>
      
      {/* 左侧历史记录栏 */}
      <div style={{ width: '250px', borderRight: '1px solid #eee', paddingRight: '10px' }}>
        <h3>📚 历史记录</h3>
        {historyList.length === 0 && <p style={{color: '#888', fontSize: '14px'}}>暂无记录</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {historyList.map(record => (
            <li
              key={record.id}
              onClick={() => handleSelectHistory(record)}
              style={{
                padding: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                backgroundColor: currentRecordId === record.id ? '#e6f7ff' : 'transparent',
                borderRadius: '4px', marginBottom: '4px', fontSize: '14px'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {record.fileName}
              </span>
              <button 
                onClick={(e) => handleDeleteHistory(e, record.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'red' }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 右侧主内容区 */}
      <div style={{ flex: 1 }}>
        <div className="ap-upload-area">
          <input ref={fileInputRef} type="file" accept=".mp3,audio/mpeg" onChange={handleFileChange} hidden />
          <button className="tp-btn tp-btn-primary" onClick={() => fileInputRef.current?.click()}>
            🎵 上传 MP3 音频
          </button>
          {fileName && <span className="ap-file-name" style={{ marginLeft: '10px' }}>{fileName}</span>}
        </div>

        {status === 'loading' && <p className="ap-status">⏳ 正在解析音频…</p>}
        {error && <p className="tp-error">{error}</p>}

        <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} />

        {status === 'ready' && sentences.length > 0 && (
          <ul className="ap-sentence-list">
            {sentences.map((s, i) => (
              <li key={i} className={`ap-sentence-row${playingIndex === i ? ' ap-sentence-row--active' : ''}`}>
                <button className="ap-play-btn" onClick={() => handlePlay(i)} title="点击播放本句">
                  {playingIndex === i ? '⏸' : '▶'}
                </button>
                <div className="ap-sentence-text">
                  <WordTokens text={s.text} />
                </div>
                <button 
                  onClick={() => handleAnalyze(s.text)}
                  style={{ marginLeft: '10px', padding: '2px 8px', cursor: 'pointer' }}
                  title="语法分析"
                >
                  D
                </button>
              </li>
            ))}
          </ul>
        )}

        {status === 'ready' && sentences.length === 0 && <p className="ap-status">未解析到任何句子。</p>}
      </div>

      {/* 挂载语法分析弹窗，传入播放相关属性 */}
           <GrammarModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        loading={isAnalyzing} 
        data={grammarData} 
        playingIndex={playingIndex}
        currentIndex={sentences.findIndex(s => s.text === grammarData?.text)}
        onPlay={(rate) => { // 💡 接收传来的速率
          const idx = sentences.findIndex(s => s.text === grammarData?.text);
          if (idx !== -1) {
            if (activeIndexRef.current === idx && rate === 1) { // 如果点的是同一句且原速，则暂停
              stopPlayback();
            } else {
              playSentence(idx, rate);
            }
          }
        }}
      />
    </div>
  )
}
import type { Word } from '../types'

interface Props {
  word: Word
  showTranslation: boolean
  onSpeak: (text: string) => void
}

export default function WordCard({ word, showTranslation, onSpeak }: Props) {
  return (
    <button
      className="word-card"
      onClick={() => onSpeak(word.english)}
      title="点击听发音"
    >
      <span className="word-emoji">{word.emoji}</span>
      <span className="word-english">{word.english}</span>
      {word.phonetic && <span className="word-phonetic">{word.phonetic}</span>}
      {showTranslation && (
        <span className="word-chinese">{word.chinese}</span>
      )}
    </button>
  )
}

import { useSpeak } from '../hooks/useSpeak'

// ---------- Free Dictionary API types ----------
export interface DictPhonetic {
  text?: string
  audio?: string
}

export interface DictDefinition {
  definition: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
}

export interface DictMeaning {
  partOfSpeech: string
  definitions: DictDefinition[]
}

export interface DictEntry {
  word: string
  phonetic?: string
  phonetics?: DictPhonetic[]
  meanings: DictMeaning[]
}

// ---------- Component ----------
interface WordDetailModalProps {
  entries: DictEntry[]
  onClose: () => void
}

export default function WordDetailModal({ entries, onClose }: WordDetailModalProps) {
  const { speak } = useSpeak()

  if (entries.length === 0) return null

  const entry = entries[0]

  // 找到第一个有文字的音标
  const phonetic =
    entry.phonetic ||
    entry.phonetics?.find((p) => p.text)?.text ||
    ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 标题行 */}
        <div className="modal-header">
          <h2 className="modal-word">{entry.word}</h2>
          {phonetic && <span className="modal-phonetic">{phonetic}</span>}
          <button
            className="modal-speak-btn"
            onClick={() => speak(entry.word)}
            title="朗读单词"
          >
            🔊
          </button>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>

        {/* 词义列表 */}
        <div className="modal-body">
          {entry.meanings.map((meaning, mi) => (
            <div key={mi} className="modal-meaning">
              <span className="modal-pos">{meaning.partOfSpeech}</span>
              <ol className="modal-definitions">
                {meaning.definitions.slice(0, 3).map((def, di) => (
                  <li key={di} className="modal-def-item">
                    <p className="modal-def-text">{def.definition}</p>
                    {def.example && (
                      <div className="modal-example-row">
                        <p className="modal-example">"{def.example}"</p>
                        <button
                          className="modal-example-speak"
                          onClick={() => speak(def.example!)}
                          title="朗读例句"
                        >
                          🔊
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

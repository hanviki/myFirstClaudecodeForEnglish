import { useSpeak } from '../hooks/useSpeak'

// ---------- 词性中文映射 ----------
const posMap: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  preposition: '介词',
  conjunction: '连词',
  pronoun: '代词',
  interjection: '感叹词',
  determiner: '限定词',
  numeral: '数词',
  article: '冠词',
  participle: '分词',
  'modal verb': '情态动词',
  'auxiliary verb': '助动词',
  'phrasal verb': '短语动词',
  prefix: '前缀',
  suffix: '后缀',
  abbreviation: '缩写',
}

function posChinese(pos: string): string {
  return posMap[pos.toLowerCase()] || pos
}

// ---------- Types ----------
export interface DictDefinition {
  definition: string
  example?: string
  definitionCn?: string
  exampleCn?: string
}

export interface DictMeaning {
  partOfSpeech: string
  definitions: DictDefinition[]
}

export interface DictEntry {
  word: string
  phonetic?: string
  chinese?: string
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 标题行 */}
        <div className="modal-header">
          <h2 className="modal-word">{entry.word}</h2>
          {entry.phonetic && <span className="modal-phonetic">{entry.phonetic}</span>}
          {entry.chinese && <span className="modal-chinese">{entry.chinese}</span>}
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

        {/* 词义列表：每个释义下直接跟例句 */}
        <div className="modal-body">
          {entry.meanings.map((meaning, mi) => (
            <div key={mi} className="modal-meaning">
              <span className="modal-pos">{posChinese(meaning.partOfSpeech)}</span>
              <ol className="modal-definitions">
                {meaning.definitions.slice(0, 3).map((def, di) => (
                  <li key={di} className="modal-def-item">
                    <p className="modal-def-text">{def.definition}</p>
                    {def.definitionCn && <p className="modal-def-cn">{def.definitionCn}</p>}
                    {def.example && (
                      <div className="modal-example-row">
                        <div className="modal-example-col">
                          <p className="modal-example">"{def.example}"</p>
                          {def.exampleCn && <p className="modal-example-cn">"{def.exampleCn}"</p>}
                        </div>
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

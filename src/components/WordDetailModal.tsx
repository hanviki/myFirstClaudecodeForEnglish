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

// ---------- Youdao API types ----------
export interface DictDefinition {
  definition: string
}

export interface DictMeaning {
  partOfSpeech: string
  partOfSpeechCn: string
  definitions: DictDefinition[]
}

export interface DictExample {
  en: string
  cn: string
}

export interface DictEntry {
  word: string
  phonetic?: string
  phoneticUs?: string
  phoneticUk?: string
  chinese: string
  meanings: DictMeaning[]
  examples: DictExample[]
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

  // 找到可用的音标
  const phonetic =
    entry.phonetic ||
    entry.phoneticUs ||
    entry.phoneticUk ||
    ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 标题行 */}
        <div className="modal-header">
          <h2 className="modal-word">{entry.word}</h2>
          {phonetic && <span className="modal-phonetic">{phonetic}</span>}
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

        {/* 词义列表 */}
        <div className="modal-body">
          {entry.meanings.map((meaning, mi) => (
            <div key={mi} className="modal-meaning">
              <span className="modal-pos">{meaning.partOfSpeechCn || meaning.partOfSpeech}</span>
              <ol className="modal-definitions">
                {meaning.definitions.slice(0, 3).map((def, di) => (
                  <li key={di} className="modal-def-item">
                    <p className="modal-def-text">{def.definition}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* 双语例句 */}
          {entry.examples && entry.examples.length > 0 && (
            <div className="modal-examples-section">
              <span className="modal-pos">例句</span>
              {entry.examples.slice(0, 3).map((ex, i) => (
                <div key={i} className="modal-example-row">
                  <div className="modal-example-col">
                    <p className="modal-example">{ex.en}</p>
                    <p className="modal-example-cn">{ex.cn}</p>
                  </div>
                  <button
                    className="modal-example-speak"
                    onClick={() => speak(ex.en)}
                    title="朗读例句"
                  >
                    🔊
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

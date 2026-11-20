import type { GrammarAnalysis } from '../utils/db'

interface Props {
  isOpen: boolean
  onClose: () => void
  loading: boolean
  data: GrammarAnalysis | null
}

export default function GrammarModal({ isOpen, onClose, loading, data }: Props) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '20px', borderRadius: '12px',
        width: '80%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto'
      }}>
        <button onClick={onClose} style={{ float: 'right', cursor: 'pointer', border: 'none', background: 'none', fontSize: '18px' }}>✕</button>
        
        <h3>句法分析</h3>
        
        {loading && <p>⏳ 正在呼叫大模型解析语法...</p>}
        
        {data && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <strong>原句：</strong> {data.text}
            </div>
            
            <div style={{ marginBottom: '20px', color: '#666' }}>
              <strong>翻译：</strong> {data.translation}
            </div>

            {/* 单词卡片区域 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              {data.tokens?.map((token: any, idx: number) => (
                <div key={idx} style={{ 
                  border: '1px solid #eee', padding: '10px', borderRadius: '8px', 
                  textAlign: 'center', minWidth: '80px' 
                }}>
                  <div style={{ fontSize: '12px', color: '#999' }}>{token.phonetic}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{token.word}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{token.meaning}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{token.pos}</div>
                </div>
              ))}
            </div>

            {/* 句法成分彩色框区域 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {data.groups?.map((group: any, idx: number) => (
                <div key={idx} style={{ 
                  border: '2px solid #1890ff', borderRadius: '8px', padding: '5px 10px', 
                  backgroundColor: '#e6f7ff' 
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1890ff', marginBottom: '5px' }}>
                    {group.name}
                  </div>
                  <div>
                    {group.indices.map((i: number) => data.tokens[i]?.word).join(' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
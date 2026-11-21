import type { GrammarAnalysis } from '../utils/db'

interface Props {
  isOpen: boolean
  onClose: () => void
  loading: boolean
  data: GrammarAnalysis | null
  playingIndex: number | null
  currentIndex: number
  onPlay?: (rate: number) => void
}

// 💡 升级：兼容大模型返回英文或中文的 type
const getColor = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('subject') || t.includes('主语')) return '#fa8c16' // 橙色
  if (t.includes('predicate') || t.includes('谓语')) return '#f5222d' // 红色
  if (t.includes('object') || t.includes('宾语')) return '#1890ff' // 蓝色
  if (t.includes('adverbial') || t.includes('状语')) return '#52c41a' // 绿色
  if (t.includes('attribute') || t.includes('定语')) return '#722ed1' // 紫色
  return '#8c8c8c' // 灰色
}

export default function GrammarModal({ isOpen, onClose, loading, data, playingIndex, currentIndex, onPlay }: Props) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '30px', borderRadius: '16px',
        width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <button onClick={onClose} style={{ float: 'right', cursor: 'pointer', border: 'none', background: 'none', fontSize: '24px' }}>✕</button>

        {loading && <p style={{ fontSize: '18px', color: '#1890ff' }}>⏳ 正在呼叫大模型解析语法...</p>}

        {data && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '15px' }}>
              <button
                onClick={() => onPlay?.(1)}
                style={{
                  padding: '5px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: playingIndex === currentIndex ? '#e6f7ff' : '#fff',
                  color: playingIndex === currentIndex ? '#1890ff' : '#333',
                  border: `1px solid ${playingIndex === currentIndex ? '#1890ff' : '#d9d9d9'}`,
                  borderRadius: '20px', transition: 'all 0.2s'
                }}
              >
                {playingIndex === currentIndex ? '⏸ 暂停原声' : '▶ 原速播放'}
              </button>

              <span style={{ fontSize: '14px', color: '#888' }}>慢速：</span>
              <button
                onClick={() => onPlay?.(0.75)}
                style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '15px', border: '1px solid #d9d9d9', backgroundColor: '#fafafa' }}
              >
                0.75x
              </button>
              <button
                onClick={() => onPlay?.(0.5)}
                style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '15px', border: '1px solid #d9d9d9', backgroundColor: '#fafafa' }}
              >
                0.5x
              </button>
            </div>
            <h3 style={{ color: '#666', fontWeight: 'normal', marginBottom: '40px' }}>翻译：{data.translation}</h3>

            {/* 核心排版区 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', marginTop: '20px' }}>
              {data.tokens?.map((token: any, idx: number) => {
                const group = data.groups?.find(g => g.indices.includes(idx));
                
                // 💡 获取颜色和极淡的背景色
                const color = group ? getColor(group.type) : '#e5e5e5';
                const bgColor = group ? `${color}15` : '#f5f5f5'; // 15 代表极低的透明度

                return (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    position: 'relative', padding: '12px 18px', borderRadius: '12px',
                    backgroundColor: bgColor,
                    border: `1px solid ${group ? color + '40' : '#e5e5e5'}`, // 淡淡的边框
                    transition: 'all 0.2s ease',
                    marginBottom: token.inflection ? '10px' : '0'
                  }}>
                    {/* 音标 */}
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', fontFamily: 'monospace' }}>
                      {token.phonetic}
                    </div>
                    {/* 单词 */}
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
                      {token.word}
                    </div>
                    
                    {/* 中文释义 */}
                    <div style={{ fontSize: '14px', color: '#555', marginTop: '8px' }}>
                      {token.meaning}
                    </div>
                    {/* 词性 */}
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {token.pos}
                    </div>

                    {/* 💡 变形考点标签（改成实心小标签） */}
                    {token.inflection && token.inflection.type && (
                      <div style={{
                        marginTop: '8px',
                        backgroundColor: '#fff7e6',
                        color: '#d46b08',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        border: '1px solid #ffd591',
                        cursor: 'help'
                      }}
                        title={token.inflection.detail}
                      >
                        {token.inflection.type}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 底部成分总结 */}
            <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '10px' }}>句法结构</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {data.groups?.map((group: any, idx: number) => {
                  const color = getColor(group.type);
                  return (
                    <div key={idx} style={{
                      padding: '6px 12px', borderRadius: '6px', border: `1px solid ${color}`,
                      backgroundColor: `${color}10`, color: color
                    }}>
                      <strong>{group.name}：</strong>
                      {group.indices.map((i: number) => data.tokens[i]?.word).join(' ')}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import type { GrammarAnalysis } from '../utils/db'

interface Props {
  isOpen: boolean
  onClose: () => void
  loading: boolean
  data: GrammarAnalysis | null
  playingIndex: number | null
  currentIndex: number
  onPlay?: () => void
}

// 给不同成分分配不同的颜色
const getColor = (type: string) => {
  switch (type) {
    case 'subject': return '#fa8c16' // 主语：橙色
    case 'predicate': return '#f5222d' // 谓语：红色
    case 'object': return '#1890ff' // 宾语：蓝色
    case 'adverbial': return '#52c41a' // 状语：绿色
    case 'attribute': return '#722ed1' // 定语：紫色
    default: return '#8c8c8c' // 其他：灰色
  }
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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>原句：{data.text}</h2>
              <button 
                onClick={onPlay} 
                style={{ 
                  marginLeft: '15px', 
                  padding: '5px 15px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: playingIndex === currentIndex ? '#e6f7ff' : '#fff', 
                  color: playingIndex === currentIndex ? '#1890ff' : '#333',
                  border: `1px solid ${playingIndex === currentIndex ? '#1890ff' : '#d9d9d9'}`, 
                  borderRadius: '20px',
                  transition: 'all 0.2s'
                }}
              >
                {playingIndex === currentIndex ? '⏸ 暂停播放' : '▶ 播放原声'}
              </button>
            </div>
            <h3 style={{ color: '#666', fontWeight: 'normal', marginBottom: '40px' }}>翻译：{data.translation}</h3>

            {/* 核心排版区 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', marginTop: '20px' }}>
              {data.tokens?.map((token: any, idx: number) => {
                // 查找这个单词属于哪个成分组
                const group = data.groups?.find(g => g.indices.includes(idx));
                const color = group ? getColor(group.type) : 'transparent';
                // 生成极淡的背景色 (加上 '1A' 代表 10% 透明度)
                const bgColor = group ? `${getColor(group.type)}1A` : 'transparent';

                return (
                  <div key={idx} style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    position: 'relative', padding: '10px 15px', borderRadius: '8px',
                    backgroundColor: bgColor,
                    transition: 'all 0.2s ease',
                  }}>
                    {/* 音标 */}
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', fontFamily: 'monospace' }}>
                      {token.phonetic}
                    </div>
                    {/* 单词 */}
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
                      {token.word}
                    </div>
                    {/* 颜色下划线 */}
                    <div style={{ height: '3px', width: '100%', backgroundColor: color, marginTop: '8px', borderRadius: '2px' }} />
                    
                    {/* 中文释义 */}
                    <div style={{ fontSize: '14px', color: '#555', marginTop: '8px' }}>
                      {token.meaning}
                    </div>
                    {/* 词性 */}
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {token.pos}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* 底部成分总结 */}
            <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '10px' }}>句法结构</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {data.groups?.map((group: any, idx: number) => (
                  <div key={idx} style={{ 
                    padding: '6px 12px', borderRadius: '6px', border: `1px solid ${getColor(group.type)}`,
                    backgroundColor: `${getColor(group.type)}10`, color: getColor(group.type)
                  }}>
                    <strong>{group.name}：</strong>
                    {group.indices.map((i: number) => data.tokens[i]?.word).join(' ')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
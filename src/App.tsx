import { useState } from 'react'
import { categories } from './data/words'
import { useSpeak } from './hooks/useSpeak'
import type { Category } from './types'
import CategoryGrid from './components/CategoryGrid'
import WordCard from './components/WordCard'
import TranslateToggle from './components/TranslateToggle'
import TextProcessor from './components/TextProcessor'

type Tab = 'words' | 'text'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('words')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const { speak } = useSpeak()

  return (
    <div className="app">
      {/* Tab 导航 */}
      <nav className="tab-nav">
        <button
          className={`tab-btn${activeTab === 'words' ? ' tab-btn--active' : ''}`}
          onClick={() => {
            setActiveTab('words')
            setSelectedCategory(null)
          }}
        >
          📖 单词学习
        </button>
        <button
          className={`tab-btn${activeTab === 'text' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          📝 文本处理
        </button>
      </nav>

      {/* 单词学习 Tab */}
      {activeTab === 'words' && (
        <>
          {!selectedCategory ? (
            <>
              <header className="app-header">
                <h1>📖 小学英语单词学习</h1>
                <p className="subtitle">选择一个分类开始学习</p>
              </header>
              <CategoryGrid categories={categories} onSelect={setSelectedCategory} />
            </>
          ) : (
            <>
              <header className="app-header">
                <button
                  className="back-btn"
                  onClick={() => setSelectedCategory(null)}
                >
                  ← 返回
                </button>
                <h1>
                  {selectedCategory.icon} {selectedCategory.name}
                </h1>
                <TranslateToggle
                  enabled={showTranslation}
                  onToggle={() => setShowTranslation((v) => !v)}
                />
              </header>
              <div className="words-grid">
                {selectedCategory.words.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    showTranslation={showTranslation}
                    onSpeak={speak}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* 文本处理 Tab */}
      {activeTab === 'text' && (
        <>
          <header className="app-header">
            <h1>📝 英文文本处理</h1>
            <p className="subtitle">输入英文，点击单词查看释义</p>
          </header>
          <TextProcessor />
        </>
      )}
    </div>
  )
}

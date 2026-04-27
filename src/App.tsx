import { useState } from 'react'
import { categories } from './data/words'
import { useSpeak } from './hooks/useSpeak'
import type { Category } from './types'
import CategoryGrid from './components/CategoryGrid'
import WordCard from './components/WordCard'
import TranslateToggle from './components/TranslateToggle'

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const { speak } = useSpeak()

  if (!selectedCategory) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>📖 小学英语单词学习</h1>
          <p className="subtitle">选择一个分类开始学习</p>
        </header>
        <CategoryGrid categories={categories} onSelect={setSelectedCategory} />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="back-btn" onClick={() => setSelectedCategory(null)}>
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
    </div>
  )
}

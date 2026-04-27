import type { Category } from '../types'

interface Props {
  categories: Category[]
  onSelect: (category: Category) => void
}

export default function CategoryGrid({ categories, onSelect }: Props) {
  return (
    <div className="category-grid">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className="category-card"
          onClick={() => onSelect(cat)}
        >
          <span className="category-icon">{cat.icon}</span>
          <span className="category-name">{cat.name}</span>
        </button>
      ))}
    </div>
  )
}

export interface Word {
  id: string
  english: string
  chinese: string
  emoji: string
  phonetic?: string
}

export interface Category {
  id: string
  name: string
  icon: string
  words: Word[]
}

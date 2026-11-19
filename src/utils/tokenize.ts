export interface Token {
  value: string
  isWord: boolean
}

/**
 * 把英文文本拆成单词 + 标点符号的 token 序列。
 * 模块 B(文本处理)和模块 C(音频点读)共用。
 */
export function tokenize(text: string): Token[] {
  const parts = text.split(/([A-Za-z]+)/)
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({ value: p, isWord: /^[A-Za-z]+$/.test(p) }))
}

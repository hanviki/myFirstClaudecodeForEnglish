import { useCallback } from 'react'

export function useSpeak() {
  const speak = useCallback((text: string, rate?: number) => {
    // 如果正在播放，先取消避免重叠
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = rate ?? 0.85   // 稍慢语速，适合小学生
    utterance.pitch = 1.0
    speechSynthesis.speak(utterance)
  }, [])

  return { speak }
}

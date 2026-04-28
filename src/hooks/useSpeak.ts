import { useCallback } from 'react'

export function useSpeak() {
  const speak = useCallback((text: string, rate?: number, onEnd?: () => void) => {
    // 如果正在播放，先取消避免重叠
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = rate ?? 1.0
    utterance.pitch = 1.0
    if (onEnd) {
      utterance.onend = onEnd
    }
    speechSynthesis.speak(utterance)
  }, [])

  return { speak }
}

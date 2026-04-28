import { useCallback } from 'react'

export function useSpeak() {
  const speak = useCallback((text: string) => {
    // 如果正在播放，先取消避免重叠
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
<<<<<<< Updated upstream
    utterance.rate = 0.85   // 稍慢语速，适合小学生
=======
    utterance.rate = rate ?? 1.0
>>>>>>> Stashed changes
    utterance.pitch = 1.0
    speechSynthesis.speak(utterance)
  }, [])

  return { speak }
}

import { useEffect, useState } from 'react'

export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canPromptInstall, setCanPromptInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIOS(ios)

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    setIsInstalled(standalone)

    const beforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanPromptInstall(true)
    }

    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
    }
  }, [])

  const installApp = async () => {
    console.log('installing app');
    
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setCanPromptInstall(false)
    }
  }

  return {
    isInstalled,
    canPromptInstall,
    installApp,
    isIOS,
  }
}
    
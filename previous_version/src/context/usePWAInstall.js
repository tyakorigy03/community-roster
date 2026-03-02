import { useEffect, useState } from 'react'

export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const checkInstalled = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true

      setIsInstalled(standalone)
    }

    checkInstalled()

    const beforeInstallHandler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', beforeInstallHandler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
    }
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return {
    isInstalled,
    canInstall: !!installPrompt,
    promptInstall,
  }
}

export default function PWAInstallModal({
  open,
  isInstalled,
  canPromptInstall,
  isIOS,
  onInstall,
  onClose,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">

        {isInstalled ? (
          <>
            <h2 className="text-lg font-semibold">App Installed</h2>
            <p className="text-sm text-gray-600 mt-2">
              Blessing Community Roster is installed on your device.
            </p>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-gray-900 text-white rounded"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              Install Blessing Community Roster
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              Get faster access and a full app experience.
            </p>

            {/* NON-iOS: ALWAYS SHOW BUTTON */}
            {!isIOS && (
              <>
                <button
                  onClick={onInstall}
                  className="mt-4 w-full py-2 bg-[#1976d2] text-white rounded"
                >
                  Install App
                </button>

                {!canPromptInstall && (
                  <p className="mt-3 text-xs text-gray-500">
                    If the install dialog does not appear, open this site
                    in Chrome or Edge and try again.
                  </p>
                )}
              </>
            )}

            {/* iOS: MANUAL INSTRUCTIONS */}
            {isIOS && (
              <div className="mt-4 text-sm text-gray-700">
                <p className="font-medium">
                  Install on iPhone or iPad:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Tap the <strong>Share</strong> button</li>
                  <li>Select <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-5 w-full py-2 text-sm text-gray-500"
            >
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

interface AppInfo {
  name: string
  version: string
  platform: string
}

function App(): React.JSX.Element {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.pos.app
      .getInfo()
      .then(setAppInfo)
      .catch((unknownError: unknown) => {
        console.error(unknownError)
        setError('No se pudo comunicar con Electron.')
      })
  }, [])

  return (
    <main>
      <h1>Sistema POS</h1>

      <p>Base inicial funcionando correctamente.</p>

      {error && <p>{error}</p>}

      {appInfo ? (
        <section>
          <p>
            <strong>Aplicación:</strong> {appInfo.name}
          </p>

          <p>
            <strong>Versión:</strong> {appInfo.version}
          </p>

          <p>
            <strong>Sistema:</strong> {appInfo.platform}
          </p>
        </section>
      ) : (
        <p>Comprobando comunicación...</p>
      )}
    </main>
  )
}

export default App
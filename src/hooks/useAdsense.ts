import { useEffect } from 'react'

const SCRIPT_ID = 'adsbygoogle-script'
const CLIENT_ID = 'ca-pub-2350736369303027'

// Carga el script de AdSense solo en páginas con contenido real y públicas
// (nunca en pantallas protegidas, vacías o de redirección), para cumplir con
// la política de Google de no servir anuncios en pantallas sin contenido.
export function useAdsense() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`
    document.head.appendChild(script)
  }, [])
}

import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · W Experiencias` : 'W Experiencias · Turismo regenerativo y de bienestar en el Maule'
  }, [title])
}

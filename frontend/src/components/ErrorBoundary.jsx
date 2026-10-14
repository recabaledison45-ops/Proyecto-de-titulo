import { Component } from 'react'
import { Button } from '@/components/ui/button'

// Evita la pantalla en blanco si un componente falla: muestra un mensaje y permite recargar.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error) { console.error(error) }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto max-w-lg p-10 text-center" role="alert">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-muted-foreground">Ocurrió un error inesperado en esta página. Intenta recargarla.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Recargar</Button>
          <Button variant="outline" onClick={() => { window.location.href = '/' }}>Ir al inicio</Button>
        </div>
      </div>
    )
  }
}

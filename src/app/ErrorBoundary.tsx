import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" style={{ padding: 32, textAlign: 'center' }}>
        <h1>Что-то пошло не так</h1>
        <p>Попробуйте перезагрузить страницу.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </div>
    )
  }
}

import './App.css'
import { DailyBoard } from './components/DailyBoard'
import { HistoryView } from './components/HistoryView'
import { useState } from 'react'

type View = 'today' | 'history'

function App() {
  const [view, setView] = useState<View>('today')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Daily Task Management</h1>
          <p className="app-subtitle">
            Track today&apos;s work, review history, and prepare for end-of-day processing.
          </p>
        </div>
        <nav className="app-nav">
          <button
            className={view === 'today' ? 'nav-button active' : 'nav-button'}
            onClick={() => setView('today')}
          >
            Today&apos;s Board
          </button>
          <button
            className={view === 'history' ? 'nav-button active' : 'nav-button'}
            onClick={() => setView('history')}
          >
            Historical View
          </button>
        </nav>
      </header>
      <main className="app-main">
        {view === 'today' ? <DailyBoard /> : <HistoryView />}
      </main>
    </div>
  )
}

export default App

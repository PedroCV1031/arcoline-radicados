import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import logoArcoline from './assets/logo-arcoline.png'
import RadicadosPage from './pages/RadicadosPage'
import ImportacionPage from './pages/ImportacionPage'
import VentasSemanalesPage from './pages/VentasSemanalesPage'
import './App.css'

function App() {
  return (
    <div className="aplicacion">
      <header className="encabezado">
        <div className="marca">
          <img
            src={logoArcoline}
            alt="Logo de Arcoline"
            className="logo"
          />

          <span className="subtitulo">Gestión de radicados</span>
        </div>

        <nav className="navegacion">
          <NavLink to="/radicados">Radicados</NavLink>
          <NavLink to="/importaciones">Importar Excel</NavLink>
          <NavLink to="/ventas-semanales">Ventas semanales</NavLink>
        </nav>
      </header>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Navigate to="/radicados" replace />} />
          <Route path="/radicados" element={<RadicadosPage />} />
          <Route path="/importaciones" element={<ImportacionPage />} />
          <Route
            path="/ventas-semanales"
            element={<VentasSemanalesPage />}
          />
          <Route path="*" element={<Navigate to="/radicados" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
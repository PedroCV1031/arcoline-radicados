import { useEffect, useState } from 'react'
import {
  NavLink,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import './App.css'
import logoArcoline from './assets/logo-arcoline.png'
import ImportacionPage from './pages/ImportacionPage'
import LoginPage from './pages/LoginPage'
import RadicadosPage from './pages/RadicadosPage'
import VentasSemanalesPage from './pages/VentasSemanalesPage'
import api from './services/api'

interface RespuestaSesion {
  autenticado: boolean
  usuario: string
}

function App() {
  const [usuario, setUsuario] = useState<string | null>(
    null,
  )
  const [validandoSesion, setValidandoSesion] =
    useState(true)

  useEffect(() => {
    async function consultarSesion() {
      try {
        const respuesta =
          await api.get<RespuestaSesion>('/api/auth/me')

        setUsuario(respuesta.data.usuario)
      } catch {
        setUsuario(null)
      } finally {
        setValidandoSesion(false)
      }
    }

    consultarSesion()
  }, [])

  useEffect(() => {
    function manejarSesionExpirada() {
      setUsuario(null)
    }

    window.addEventListener(
      'sesion-expirada',
      manejarSesionExpirada,
    )

    return () => {
      window.removeEventListener(
        'sesion-expirada',
        manejarSesionExpirada,
      )
    }
  }, [])

  async function cerrarSesion() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setUsuario(null)
    }
  }

  if (validandoSesion) {
    return (
      <main className="pantalla-login">
        <div className="mensaje-estado">
          Validando sesión...
        </div>
      </main>
    )
  }

  if (!usuario) {
    return <LoginPage onLogin={setUsuario} />
  }

  return (
    <div className="aplicacion">
      <header className="encabezado">
        <div className="marca">
          <img
            src={logoArcoline}
            alt="Logo de Arcoline"
            className="logo"
          />

          <span className="subtitulo">
            Plataforma producción de arcos
          </span>
        </div>

        <div className="controles-encabezado">
          <nav className="navegacion">
            <NavLink to="/importaciones">
              Importar y exportar Excel
            </NavLink>

            <NavLink to="/radicados">
              Radicados
            </NavLink>

            <NavLink to="/produccion-semanal">
              Produccion semanal
            </NavLink>
          </nav>

          <div className="sesion-encabezado">
            <span>{usuario}</span>

            <button
              type="button"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="contenido">
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to="/importaciones" replace />
            }
          />

          <Route
            path="/importaciones"
            element={<ImportacionPage />}
          />

          <Route
            path="/radicados"
            element={<RadicadosPage />}
          />

          <Route
            path="/produccion-semanal"
            element={<VentasSemanalesPage />}
          />

          <Route
            path="*"
            element={
              <Navigate to="/importaciones" replace />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App

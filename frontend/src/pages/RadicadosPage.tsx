import { useEffect, useState } from 'react'
import api from '../services/api'

interface Metadatos {
  archivo_origen?: string
  hoja_origen?: string
  fila_origen?: number
  fecha_importacion?: string
  lote_importacion?: string
}

interface Radicado {
  _id: string
  'Fecha inicio': string | null
  'Fecha limite': string | null
  Cliente: string | null
  'Orden de compra': string | number | null
  Referencia: string | null
  Talla: string | number | null
  Cantidad: number | null
  'Unidades despachadas': number | null
  'Fecha entrega final': string | null
  _metadatos?: Metadatos
}

interface RespuestaRadicados {
  pagina: number
  limite: number
  total_registros: number
  total_paginas: number
  registros: Radicado[]
}

function formatearFecha(fecha: string | null) {
  if (!fecha) {
    return '—'
  }

  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function RadicadosPage() {
  const [registros, setRegistros] = useState<Radicado[]>([])
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const limite = 20

  useEffect(() => {
    async function consultarRadicados() {
      try {
        setCargando(true)
        setError('')

        const respuesta = await api.get<RespuestaRadicados>(
          '/api/radicados',
          {
            params: {
              pagina,
              limite,
            },
          },
        )

        setRegistros(respuesta.data.registros)
        setTotalPaginas(respuesta.data.total_paginas)
        setTotalRegistros(respuesta.data.total_registros)
      } catch (errorConsulta) {
        console.error(errorConsulta)
        setError(
          'No fue posible consultar los radicados. Verifica que el backend esté ejecutándose.',
        )
      } finally {
        setCargando(false)
      }
    }

    consultarRadicados()
  }, [pagina])

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h2>Radicados</h2>
          <p>Información almacenada actualmente en MongoDB.</p>
        </div>

        <div className="contador-registros">
          {totalRegistros.toLocaleString('es-CO')} registros
        </div>
      </div>

      {cargando && (
        <div className="mensaje-estado">Consultando información...</div>
      )}

      {error && <div className="mensaje-error">{error}</div>}

      {!cargando && !error && (
        <>
          <div className="contenedor-tabla">
            <table className="tabla-radicados">
              <thead>
                <tr>
                  <th>Fecha inicial</th>
                  <th>Cliente</th>
                  <th>Orden de compra</th>
                  <th>Referencia</th>
                  <th>Talla</th>
                  <th>Cantidad</th>
                  <th>Despachadas</th>
                  <th>Hoja de origen</th>
                </tr>
              </thead>

              <tbody>
                {registros.map((registro) => (
                  <tr key={registro._id}>
                    <td>{formatearFecha(registro['Fecha inicio'])}</td>
                    <td>{registro.Cliente ?? '—'}</td>
                    <td>{registro['Orden de compra'] ?? '—'}</td>
                    <td>{registro.Referencia ?? '—'}</td>
                    <td>{registro.Talla ?? '—'}</td>
                    <td>
                      {registro.Cantidad?.toLocaleString('es-CO') ?? '—'}
                    </td>
                    <td>
                      {registro[
                        'Unidades despachadas'
                      ]?.toLocaleString('es-CO') ?? '—'}
                    </td>
                    <td>{registro._metadatos?.hoja_origen ?? '—'}</td>
                  </tr>
                ))}

                {registros.length === 0 && (
                  <tr>
                    <td colSpan={8} className="sin-resultados">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="paginacion">
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() => setPagina((actual) => actual - 1)}
            >
              Anterior
            </button>

            <span>
              Página {pagina} de {totalPaginas}
            </span>

            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((actual) => actual + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default RadicadosPage
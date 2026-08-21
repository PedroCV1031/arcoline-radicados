import axios from 'axios'
import { useState } from 'react'
import type { ChangeEvent } from 'react'

import api from '../services/api'

interface RespuestaHojas {
  archivo: string
  total_hojas: number
  hojas_validas: string[]
  hojas_ignoradas: string[]
}

interface ResultadoHoja {
  hoja: string
  registros_eliminados: number
  registros_insertados: number
}

interface ResultadoImportacion {
  mensaje: string
  archivo: string
  lote_importacion: string
  hojas_procesadas: ResultadoHoja[]
  total_insertados: number
  total_eliminados: number
}

function obtenerMensajeError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Ocurrió un error inesperado.'
  }

  const detalle = error.response?.data?.detail

  if (typeof detalle === 'string') {
    return detalle
  }

  if (detalle?.mensaje) {
    const hojasInvalidas = detalle.hojas_invalidas?.join(', ')
    const columnasFaltantes =
      detalle.columnas_faltantes?.join(', ')

    if (hojasInvalidas) {
      return `${detalle.mensaje}: ${hojasInvalidas}`
    }

    if (columnasFaltantes) {
      return `${detalle.mensaje}. Columnas faltantes: ${columnasFaltantes}`
    }

    return detalle.mensaje
  }

  return 'No fue posible completar la operación.'
}

function ImportacionPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [informacionHojas, setInformacionHojas] =
    useState<RespuestaHojas | null>(null)

  const [hojasSeleccionadas, setHojasSeleccionadas] =
    useState<string[]>([])

  const [confirmarReemplazo, setConfirmarReemplazo] =
    useState(false)

  const [consultando, setConsultando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] =
    useState<ResultadoImportacion | null>(null)

  function seleccionarArchivo(
    evento: ChangeEvent<HTMLInputElement>,
  ) {
    const archivoSeleccionado =
      evento.target.files?.[0] ?? null

    setArchivo(archivoSeleccionado)
    setInformacionHojas(null)
    setHojasSeleccionadas([])
    setConfirmarReemplazo(false)
    setResultado(null)
    setError('')
  }

  async function consultarHojas() {
    if (!archivo) {
      setError('Debes seleccionar un archivo Excel.')
      return
    }

    try {
      setConsultando(true)
      setError('')
      setResultado(null)

      const formulario = new FormData()
      formulario.append('archivo', archivo)

      const respuesta = await api.post<RespuestaHojas>(
        '/api/importaciones/hojas',
        formulario,
      )

      setInformacionHojas(respuesta.data)
      setHojasSeleccionadas([])
      setConfirmarReemplazo(false)
    } catch (errorConsulta) {
      setInformacionHojas(null)
      setHojasSeleccionadas([])
      setError(obtenerMensajeError(errorConsulta))
    } finally {
      setConsultando(false)
    }
  }

  function cambiarSeleccionHoja(hoja: string) {
    setHojasSeleccionadas((seleccionActual) => {
      if (seleccionActual.includes(hoja)) {
        return seleccionActual.filter(
          (hojaSeleccionada) =>
            hojaSeleccionada !== hoja,
        )
      }

      return [...seleccionActual, hoja]
    })

    setConfirmarReemplazo(false)
    setResultado(null)
  }

  function seleccionarTodasLasHojas() {
    if (!informacionHojas) return

    setHojasSeleccionadas([
      ...informacionHojas.hojas_validas,
    ])

    setConfirmarReemplazo(false)
  }

  function quitarSeleccion() {
    setHojasSeleccionadas([])
    setConfirmarReemplazo(false)
  }

  async function importarHojas() {
    if (!archivo) {
      setError('Debes seleccionar un archivo Excel.')
      return
    }

    if (hojasSeleccionadas.length === 0) {
      setError('Debes seleccionar al menos una hoja.')
      return
    }

    if (!confirmarReemplazo) {
      setError(
        'Debes confirmar el reemplazo de las hojas seleccionadas.',
      )
      return
    }

    try {
      setImportando(true)
      setError('')
      setResultado(null)

      const formulario = new FormData()
      formulario.append('archivo', archivo)

      hojasSeleccionadas.forEach((hoja) => {
        formulario.append('hojas', hoja)
      })

      formulario.append('confirmar', 'true')

      const respuesta = await api.post<ResultadoImportacion>(
        '/api/importaciones/cargar',
        formulario,
      )

      setResultado(respuesta.data)
      setConfirmarReemplazo(false)
    } catch (errorImportacion) {
      setError(obtenerMensajeError(errorImportacion))
    } finally {
      setImportando(false)
    }
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h2>Importar Excel</h2>
          <p>
            Selecciona las hojas que deseas reemplazar en
            MongoDB.
          </p>
        </div>
      </div>

      <div className="zona-archivo">
        <div className="campo-archivo">
          <label htmlFor="archivoExcel">
            Archivo Excel
          </label>

          <input
            id="archivoExcel"
            type="file"
            accept=".xlsx,.xlsm"
            onChange={seleccionarArchivo}
          />

          <small>
            Formatos permitidos: .xlsx y .xlsm. Tamaño máximo:
            20 MB.
          </small>
        </div>

        <button
          type="button"
          className="boton-principal"
          disabled={!archivo || consultando}
          onClick={consultarHojas}
        >
          {consultando
            ? 'Consultando hojas...'
            : 'Consultar hojas'}
        </button>
      </div>

      {archivo && (
        <div className="archivo-seleccionado">
          <strong>Archivo seleccionado:</strong>{' '}
          {archivo.name}
        </div>
      )}

      {error && <div className="mensaje-error">{error}</div>}

      {informacionHojas && (
        <div className="bloque-hojas">
          <div className="encabezado-hojas">
            <div>
              <h3>Hojas válidas</h3>
              <p>
                Selecciona las hojas que deseas cargar. Los
                registros existentes de esas hojas serán
                reemplazados.
              </p>
            </div>

            <div className="acciones-hojas">
              <button
                type="button"
                className="boton-secundario"
                onClick={seleccionarTodasLasHojas}
              >
                Seleccionar todas
              </button>

              <button
                type="button"
                className="boton-secundario"
                onClick={quitarSeleccion}
              >
                Quitar selección
              </button>
            </div>
          </div>

          <div className="lista-hojas">
            {informacionHojas.hojas_validas.map((hoja) => (
              <label key={hoja} className="opcion-hoja">
                <input
                  type="checkbox"
                  checked={hojasSeleccionadas.includes(hoja)}
                  onChange={() => cambiarSeleccionHoja(hoja)}
                />

                <span>{hoja}</span>
              </label>
            ))}
          </div>

          {informacionHojas.hojas_ignoradas.length > 0 && (
            <div className="hojas-ignoradas">
              <strong>Hojas ignoradas:</strong>{' '}
              {informacionHojas.hojas_ignoradas.join(', ')}
            </div>
          )}

          <label className="confirmacion-reemplazo">
            <input
              type="checkbox"
              checked={confirmarReemplazo}
              disabled={hojasSeleccionadas.length === 0}
              onChange={(evento) =>
                setConfirmarReemplazo(
                  evento.target.checked,
                )
              }
            />

            <span>
              Confirmo que deseo reemplazar en MongoDB los
              registros de las hojas seleccionadas.
            </span>
          </label>

          <div className="pie-importacion">
            <span>
              {hojasSeleccionadas.length}{' '}
              {hojasSeleccionadas.length === 1
                ? 'hoja seleccionada'
                : 'hojas seleccionadas'}
            </span>

            <button
              type="button"
              className="boton-importar"
              disabled={
                importando ||
                hojasSeleccionadas.length === 0 ||
                !confirmarReemplazo
              }
              onClick={importarHojas}
            >
              {importando
                ? 'Importando información...'
                : 'Importar y reemplazar'}
            </button>
          </div>
        </div>
      )}

      {resultado && (
        <div className="resultado-importacion">
          <h3>{resultado.mensaje}</h3>

          <div className="resumen-importacion">
            <div className="tarjeta-resumen">
              <span>Registros insertados</span>
              <strong>
                {resultado.total_insertados.toLocaleString(
                  'es-CO',
                )}
              </strong>
            </div>

            <div className="tarjeta-resumen">
              <span>Registros reemplazados</span>
              <strong>
                {resultado.total_eliminados.toLocaleString(
                  'es-CO',
                )}
              </strong>
            </div>
          </div>

          <div className="contenedor-tabla">
            <table className="tabla-radicados">
              <thead>
                <tr>
                  <th>Hoja</th>
                  <th>Eliminados</th>
                  <th>Insertados</th>
                </tr>
              </thead>

              <tbody>
                {resultado.hojas_procesadas.map((hoja) => (
                  <tr key={hoja.hoja}>
                    <td>{hoja.hoja}</td>
                    <td>
                      {hoja.registros_eliminados.toLocaleString(
                        'es-CO',
                      )}
                    </td>
                    <td>
                      {hoja.registros_insertados.toLocaleString(
                        'es-CO',
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="lote-importacion">
            Lote de importación:{' '}
            <code>{resultado.lote_importacion}</code>
          </p>
        </div>
      )}
    </section>
  )
}

export default ImportacionPage
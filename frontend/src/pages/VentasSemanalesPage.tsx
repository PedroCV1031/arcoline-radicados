import axios from 'axios'
import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import api from '../services/api'

interface DatoSemanal {
  semana: string
  referencia: string
  unidades: number
}

interface ResumenReferencia {
  referencia: string
  unidades: number
}

interface RespuestaVentas {
  filtros: {
    fecha_inicial: string | null
    fecha_final: string | null
    cliente: string | null
    referencia: string | null
  }
  total_unidades: number
  total_semanas: number
  total_referencias: number
  referencias: ResumenReferencia[]
  datos: DatoSemanal[]
}

interface OpcionesFiltros {
  clientes: string[]
  referencias: string[]
  hojas: string[]
  tallas: string[]
}

interface FiltrosVentas {
  fechaInicial: string
  fechaFinal: string
  cliente: string
  referencia: string
}

interface PuntoGrafica {
  semana: string
  [referencia: string]: string | number
}

interface PuntoTorta {
  referencia: string
  unidades: number
}

type TipoGrafica =
  | 'barras-apiladas'
  | 'barras-agrupadas'
  | 'lineas'
  | 'torta'

const COLORES_GRAFICA = [
  '#08783f',
  '#c0007f',
  '#2f855a',
  '#2563eb',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
]

function fechaLocalParaInput(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function crearFiltrosIniciales(): FiltrosVentas {
  const hoy = new Date()
  const primerDiaDelMes = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    1,
  )

  return {
    fechaInicial: fechaLocalParaInput(primerDiaDelMes),
    fechaFinal: fechaLocalParaInput(hoy),
    cliente: '',
    referencia: '',
  }
}

function formatearSemana(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaLocal = new Date(anio, mes - 1, dia)

  return fechaLocal.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function obtenerMensajeError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Ocurrió un error inesperado.'
  }

  const detalle = error.response?.data?.detail

  if (typeof detalle === 'string') {
    return detalle
  }

  return 'No fue posible consultar las ventas semanales.'
}

function VentasSemanalesPage() {
  const filtrosIniciales = crearFiltrosIniciales()

  const [filtros, setFiltros] =
    useState<FiltrosVentas>(filtrosIniciales)

  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosVentas>(filtrosIniciales)

  const [opciones, setOpciones] = useState<OpcionesFiltros>({
    clientes: [],
    referencias: [],
    hojas: [],
    tallas: [],
  })

  const [resultado, setResultado] =
    useState<RespuestaVentas | null>(null)

  const [cantidadReferencias, setCantidadReferencias] =
    useState(5)
  const [tipoGrafica, setTipoGrafica] =
    useState<TipoGrafica>('barras-apiladas')
  const [semanaTorta, setSemanaTorta] = useState('')

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function consultarOpciones() {
      try {
        const respuesta = await api.get<OpcionesFiltros>(
          '/api/radicados/opciones-filtros',
        )

        setOpciones(respuesta.data)
      } catch (errorOpciones) {
        console.error(errorOpciones)
      }
    }

    consultarOpciones()
  }, [])

  useEffect(() => {
    async function consultarVentas() {
      try {
        setCargando(true)
        setError('')

        const respuesta = await api.get<RespuestaVentas>(
          '/api/ventas/semanales',
          {
            params: {
              fecha_inicial:
                filtrosAplicados.fechaInicial || undefined,
              fecha_final:
                filtrosAplicados.fechaFinal || undefined,
              cliente:
                filtrosAplicados.cliente || undefined,
              referencia:
                filtrosAplicados.referencia || undefined,
            },
          },
        )

        setResultado(respuesta.data)
      } catch (errorConsulta) {
        setResultado(null)
        setError(obtenerMensajeError(errorConsulta))
      } finally {
        setCargando(false)
      }
    }

    consultarVentas()
  }, [filtrosAplicados])

  useEffect(() => {
    if (!resultado) {
      return
    }

    const maximoReferencias = Math.max(
      resultado.total_referencias,
      1,
    )

    setCantidadReferencias((cantidadActual) =>
      Math.min(
        Math.max(cantidadActual, 1),
        maximoReferencias,
      ),
    )

    const semanasDisponibles = Array.from(
      new Set(resultado.datos.map((dato) => dato.semana)),
    ).sort()

    setSemanaTorta((semanaActual) =>
      semanasDisponibles.includes(semanaActual)
        ? semanaActual
        : (semanasDisponibles.at(-1) ?? ''),
    )
  }, [resultado])

  function aplicarFiltros(
    evento: SubmitEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()

    if (
      filtros.fechaInicial &&
      filtros.fechaFinal &&
      filtros.fechaFinal < filtros.fechaInicial
    ) {
      setError(
        'La fecha final no puede ser anterior a la fecha inicial.',
      )
      return
    }

    setFiltrosAplicados({ ...filtros })
  }

  function limpiarFiltros() {
    const filtrosLimpios: FiltrosVentas = {
      fechaInicial: '',
      fechaFinal: '',
      cliente: '',
      referencia: '',
    }

    setFiltros(filtrosLimpios)
    setFiltrosAplicados(filtrosLimpios)
  }

  const maximoReferencias = Math.max(
    resultado?.total_referencias ?? 1,
    1,
  )

  const cantidadReferenciasAplicada =
    filtrosAplicados.referencia
      ? 1
      : Math.min(cantidadReferencias, maximoReferencias)

  const semanasDisponibles = Array.from(
    new Set(resultado?.datos.map((dato) => dato.semana) ?? []),
  ).sort()

  const referenciasOrdenadasTorta =
    resultado?.datos
      .filter((dato) => dato.semana === semanaTorta)
      .sort((primero, segundo) =>
        segundo.unidades - primero.unidades,
      ) ?? []

  const referenciasGrafica =
    tipoGrafica === 'torta'
      ? referenciasOrdenadasTorta
          .slice(0, cantidadReferenciasAplicada)
          .map((item) => item.referencia)
      : (resultado?.referencias
          .slice(0, cantidadReferenciasAplicada)
          .map((item) => item.referencia) ?? [])

  const datosPorSemana = new Map<string, PuntoGrafica>()
  let existenOtras = false

  resultado?.datos.forEach((dato) => {
    if (tipoGrafica === 'torta' && dato.semana !== semanaTorta) {
      return
    }

    const puntoExistente = datosPorSemana.get(dato.semana) ?? {
      semana: dato.semana,
    }

    const referenciaGrafica = referenciasGrafica.includes(
      dato.referencia,
    )
      ? dato.referencia
      : 'OTRAS'

    if (referenciaGrafica === 'OTRAS') {
      existenOtras = true
    }

    puntoExistente[referenciaGrafica] =
      Number(puntoExistente[referenciaGrafica] ?? 0) +
      dato.unidades

    datosPorSemana.set(dato.semana, puntoExistente)
  })

  const seriesGrafica = existenOtras
    ? [...referenciasGrafica, 'OTRAS']
    : referenciasGrafica

  const datosGrafica = Array.from(
    datosPorSemana.values(),
  )
    .map((punto) => {
      const puntoCompleto = { ...punto }

      seriesGrafica.forEach((referencia) => {
        puntoCompleto[referencia] ??= 0
      })

      return puntoCompleto
    })
    .sort((primero, segundo) =>
      String(primero.semana).localeCompare(
        String(segundo.semana),
      ),
    )

  const datosTorta: PuntoTorta[] = seriesGrafica.map(
    (referencia) => ({
      referencia,
      unidades: Number(
        datosGrafica[0]?.[referencia] ?? 0,
      ),
    }),
  )

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h2>Ventas semanales</h2>
          <p>
            Unidades radicadas agrupadas por semana y
            referencia.
          </p>
        </div>
      </div>

      <form
        className="panel-filtros panel-filtros-ventas"
        onSubmit={aplicarFiltros}
      >
        <div className="contenido-filtros">
          <div className="fila-filtros fila-filtros-ventas-principal">
            <div className="campo-filtro">
              <label htmlFor="ventaFechaInicial">
                Fecha inicial
              </label>

              <input
                id="ventaFechaInicial"
                type="date"
                value={filtros.fechaInicial}
                onChange={(evento) =>
                  setFiltros((actuales) => ({
                    ...actuales,
                    fechaInicial: evento.target.value,
                  }))
                }
              />
            </div>

            <div className="campo-filtro">
              <label htmlFor="ventaFechaFinal">
                Fecha final
              </label>

              <input
                id="ventaFechaFinal"
                type="date"
                value={filtros.fechaFinal}
                onChange={(evento) =>
                  setFiltros((actuales) => ({
                    ...actuales,
                    fechaFinal: evento.target.value,
                  }))
                }
              />
            </div>

            <div className="campo-filtro">
              <label htmlFor="ventaCliente">Cliente</label>

              <select
                id="ventaCliente"
                value={filtros.cliente}
                onChange={(evento) =>
                  setFiltros((actuales) => ({
                    ...actuales,
                    cliente: evento.target.value,
                  }))
                }
              >
                <option value="">Todos</option>

                {opciones.clientes.map((cliente) => (
                  <option key={cliente} value={cliente}>
                    {cliente}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo-filtro">
              <label htmlFor="ventaReferencia">
                Referencia
              </label>

              <select
                id="ventaReferencia"
                value={filtros.referencia}
                onChange={(evento) =>
                  setFiltros((actuales) => ({
                    ...actuales,
                    referencia: evento.target.value,
                  }))
                }
              >
                <option value="">Todas</option>

                {opciones.referencias.map((referencia) => (
                  <option key={referencia} value={referencia}>
                    {referencia}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fila-filtros fila-filtros-ventas-grafica">
            <div className="campo-filtro">
              <label htmlFor="tipoGrafica">
                Tipo de gráfica
              </label>

              <select
                id="tipoGrafica"
                value={tipoGrafica}
                onChange={(evento) =>
                  setTipoGrafica(
                    evento.target.value as TipoGrafica,
                  )
                }
              >
                <option value="barras-apiladas">
                  Barras apiladas
                </option>
                <option value="barras-agrupadas">
                  Barras agrupadas
                </option>
                <option value="lineas">Líneas</option>
                <option value="torta">Torta</option>
              </select>
            </div>

            <div className="campo-filtro">
              <label htmlFor="cantidadReferencias">
                Referencias en gráfica
              </label>

              <input
                id="cantidadReferencias"
                type="number"
                min="1"
                max={maximoReferencias}
                value={
                  filtros.referencia
                    ? 1
                    : cantidadReferencias
                }
                disabled={Boolean(filtros.referencia)}
                onChange={(evento) => {
                  const cantidad = Number(evento.target.value)

                  setCantidadReferencias(
                    Math.min(
                      Math.max(cantidad || 1, 1),
                      maximoReferencias,
                    ),
                  )
                }}
              />

              <small>Máximo disponible: {maximoReferencias}</small>
            </div>

            {tipoGrafica === 'torta' && (
              <div className="campo-filtro">
                <label htmlFor="semanaTorta">
                  Semana para la torta
                </label>

                <select
                  id="semanaTorta"
                  value={semanaTorta}
                  onChange={(evento) =>
                    setSemanaTorta(evento.target.value)
                  }
                >
                  {semanasDisponibles.map((semana) => (
                    <option key={semana} value={semana}>
                      {formatearSemana(semana)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="acciones-filtros acciones-filtros-ventas">
          <button type="submit" className="boton-principal">
            Consultar
          </button>

          <button
            type="button"
            className="boton-secundario"
            onClick={limpiarFiltros}
          >
            Limpiar
          </button>
        </div>
      </form>

      {cargando && (
        <div className="mensaje-estado">
          Consultando ventas semanales...
        </div>
      )}

      {error && <div className="mensaje-error">{error}</div>}

      {!cargando && !error && resultado && (
        <>
          <div className="resumen-ventas">
            <div className="tarjeta-indicador">
              <span>Total de unidades</span>
              <strong>
                {resultado.total_unidades.toLocaleString(
                  'es-CO',
                )}
              </strong>
            </div>

            <div className="tarjeta-indicador">
              <span>Semanas</span>
              <strong>{resultado.total_semanas}</strong>
            </div>

            <div className="tarjeta-indicador">
              <span>Referencias</span>
              <strong>{resultado.total_referencias}</strong>
            </div>
          </div>

          {resultado.datos.length > 0 ? (
            <>
              <div className="grafica-ventas">
                <div className="encabezado-grafica">
                  <div>
                    <h3>
                      {tipoGrafica === 'torta'
                        ? `Distribución de unidades — ${
                            semanaTorta
                              ? formatearSemana(semanaTorta)
                              : 'sin semana'
                          }`
                        : 'Unidades por semana'}
                    </h3>

                    <p>
                      Se muestran las{' '}
                      {Math.min(
                        cantidadReferenciasAplicada,
                        referenciasGrafica.length,
                      )}{' '}
                      referencias con más unidades
                      {existenOtras
                        ? ' y las restantes se agrupan como OTRAS.'
                        : '.'}
                    </p>
                  </div>
                </div>

                {tipoGrafica === 'torta' ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={datosTorta}
                        dataKey="unidades"
                        nameKey="referencia"
                        cx="50%"
                        cy="50%"
                        outerRadius={140}
                        label={({ name, percent }) =>
                          `${name}: ${(
                            Number(percent ?? 0) * 100
                          ).toFixed(1)}%`
                        }
                      >
                        {datosTorta.map((dato, indice) => (
                          <Cell
                            key={dato.referencia}
                            fill={
                              COLORES_GRAFICA[
                                indice % COLORES_GRAFICA.length
                              ]
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(valor) =>
                          Number(valor ?? 0).toLocaleString(
                            'es-CO',
                          )
                        }
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : tipoGrafica === 'lineas' ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={datosGrafica}
                      margin={{
                        top: 20,
                        right: 20,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#dce8e0"
                      />

                      <XAxis
                        dataKey="semana"
                        tickFormatter={formatearSemana}
                        minTickGap={28}
                      />

                      <YAxis
                        tickFormatter={(valor) =>
                          Number(valor).toLocaleString('es-CO')
                        }
                      />

                      <Tooltip
                        labelFormatter={(valor) =>
                          `Semana: ${formatearSemana(
                            String(valor),
                          )}`
                        }
                        formatter={(valor) =>
                          Number(valor ?? 0).toLocaleString(
                            'es-CO',
                          )
                        }
                      />

                      <Legend />

                      {seriesGrafica.map((referencia, indice) => (
                        <Line
                          key={referencia}
                          type="monotone"
                          dataKey={referencia}
                          stroke={
                            COLORES_GRAFICA[
                              indice % COLORES_GRAFICA.length
                            ]
                          }
                          strokeWidth={2}
                          dot={resultado.total_semanas <= 20}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={datosGrafica}
                      margin={{
                        top: 20,
                        right: 20,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#dce8e0"
                      />

                      <XAxis
                        dataKey="semana"
                        tickFormatter={formatearSemana}
                        minTickGap={28}
                      />

                      <YAxis
                        tickFormatter={(valor) =>
                          Number(valor).toLocaleString('es-CO')
                        }
                      />

                      <Tooltip
                        labelFormatter={(valor) =>
                          `Semana: ${formatearSemana(
                            String(valor),
                          )}`
                        }
                        formatter={(valor) =>
                          Number(valor ?? 0).toLocaleString(
                            'es-CO',
                          )
                        }
                      />

                      <Legend />

                      {seriesGrafica.map((referencia, indice) => (
                        <Bar
                          key={referencia}
                          dataKey={referencia}
                          stackId={
                            tipoGrafica === 'barras-apiladas'
                              ? 'unidades'
                              : undefined
                          }
                          fill={
                            COLORES_GRAFICA[
                              indice % COLORES_GRAFICA.length
                            ]
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bloque-tabla-ventas">
                <h3>Detalle semanal</h3>

                <div className="contenedor-tabla">
                  <table className="tabla-radicados">
                    <thead>
                      <tr>
                        <th>Semana</th>
                        <th>Referencia</th>
                        <th>Unidades</th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultado.datos.map((dato) => (
                        <tr
                          key={`${dato.semana}-${dato.referencia}`}
                        >
                          <td>
                            {formatearSemana(dato.semana)}
                          </td>
                          <td>{dato.referencia}</td>
                          <td>
                            {dato.unidades.toLocaleString(
                              'es-CO',
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bloque-tabla-ventas">
                <h3>Total por referencia</h3>

                <div className="contenedor-tabla">
                  <table className="tabla-radicados">
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Total de unidades</th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultado.referencias.map((item) => (
                        <tr key={item.referencia}>
                          <td>{item.referencia}</td>
                          <td>
                            {item.unidades.toLocaleString(
                              'es-CO',
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="sin-datos-ventas">
              No se encontraron registros para los filtros
              seleccionados.
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default VentasSemanalesPage

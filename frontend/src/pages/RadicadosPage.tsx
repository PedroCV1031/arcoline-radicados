import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
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

interface OpcionesFiltros {
  clientes: string[]
  referencias: string[]
  hojas: string[]
  tallas: string[]
}

interface Filtros {
  fechaInicial: string
  fechaFinal: string
  cliente: string
  referencia: string
  ordenCompra: string
  hojaOrigen: string
  talla: string
  ordenarPor: string
  direccion: string
  limite: number
}

const filtrosIniciales: Filtros = {
  fechaInicial: '',
  fechaFinal: '',
  cliente: '',
  referencia: '',
  ordenCompra: '',
  hojaOrigen: '',
  talla: '',
  ordenarPor: 'fecha_inicio',
  direccion: 'desc',
  limite: 20,
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return '—'

  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function RadicadosPage() {
  const [registros, setRegistros] = useState<Radicado[]>([])
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [filtros, setFiltros] =
    useState<Filtros>(filtrosIniciales)

  const [filtrosAplicados, setFiltrosAplicados] =
    useState<Filtros>(filtrosIniciales)

  const [opciones, setOpciones] = useState<OpcionesFiltros>({
    clientes: [],
    referencias: [],
    hojas: [],
    tallas: [],
  })

  function actualizarFiltro<K extends keyof Filtros>(
    campo: K,
    valor: Filtros[K],
  ) {
    setFiltros((anteriores) => ({
      ...anteriores,
      [campo]: valor,
    }))
  }

  useEffect(() => {
    async function consultarOpciones() {
      try {
        const respuesta = await api.get<OpcionesFiltros>(
          '/api/radicados/opciones-filtros',
        )

        setOpciones(respuesta.data)
      } catch (errorOpciones) {
        console.error(
          'No fue posible cargar las opciones:',
          errorOpciones,
        )
      }
    }

    consultarOpciones()
  }, [])

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
              limite: filtrosAplicados.limite,
              fecha_inicial:
                filtrosAplicados.fechaInicial || undefined,
              fecha_final:
                filtrosAplicados.fechaFinal || undefined,
              cliente:
                filtrosAplicados.cliente || undefined,
              referencia:
                filtrosAplicados.referencia || undefined,
              orden_compra:
                filtrosAplicados.ordenCompra || undefined,
              hoja_origen:
                filtrosAplicados.hojaOrigen || undefined,
              talla:
                filtrosAplicados.talla || undefined,
              ordenar_por: filtrosAplicados.ordenarPor,
              direccion: filtrosAplicados.direccion,
            },
          },
        )

        setRegistros(respuesta.data.registros)
        setTotalPaginas(respuesta.data.total_paginas)
        setTotalRegistros(respuesta.data.total_registros)
      } catch (errorConsulta) {
        console.error(errorConsulta)

        setError(
          'No fue posible consultar los radicados.',
        )
      } finally {
        setCargando(false)
      }
    }

    consultarRadicados()
  }, [pagina, filtrosAplicados])

  function aplicarFiltros(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    setPagina(1)
    setFiltrosAplicados({ ...filtros })
  }

  function limpiarFiltros() {
    setPagina(1)
    setFiltros({ ...filtrosIniciales })
    setFiltrosAplicados({ ...filtrosIniciales })
  }

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

      <form className="panel-filtros" onSubmit={aplicarFiltros}>
        <div className="campo-filtro">
          <label htmlFor="fechaInicial">Fecha inicial</label>
          <input
            id="fechaInicial"
            type="date"
            value={filtros.fechaInicial}
            onChange={(evento) =>
              actualizarFiltro(
                'fechaInicial',
                evento.target.value,
              )
            }
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="fechaFinal">Fecha final</label>
          <input
            id="fechaFinal"
            type="date"
            value={filtros.fechaFinal}
            onChange={(evento) =>
              actualizarFiltro(
                'fechaFinal',
                evento.target.value,
              )
            }
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="cliente">Cliente</label>
          <select
            id="cliente"
            value={filtros.cliente}
            onChange={(evento) =>
              actualizarFiltro('cliente', evento.target.value)
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
          <label htmlFor="referencia">Referencia</label>
          <select
            id="referencia"
            value={filtros.referencia}
            onChange={(evento) =>
              actualizarFiltro(
                'referencia',
                evento.target.value,
              )
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

        <div className="campo-filtro">
          <label htmlFor="ordenCompra">Orden de compra</label>
          <input
            id="ordenCompra"
            type="text"
            placeholder="Ejemplo: 11048"
            value={filtros.ordenCompra}
            onChange={(evento) =>
              actualizarFiltro(
                'ordenCompra',
                evento.target.value,
              )
            }
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="hojaOrigen">Hoja de origen</label>
          <select
            id="hojaOrigen"
            value={filtros.hojaOrigen}
            onChange={(evento) =>
              actualizarFiltro(
                'hojaOrigen',
                evento.target.value,
              )
            }
          >
            <option value="">Todas</option>

            {opciones.hojas.map((hoja) => (
              <option key={hoja} value={hoja}>
                {hoja}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="talla">Talla</label>
          <select
            id="talla"
            value={filtros.talla}
            onChange={(evento) =>
              actualizarFiltro('talla', evento.target.value)
            }
          >
            <option value="">Todas</option>

            {opciones.tallas.map((talla) => (
              <option key={talla} value={talla}>
                {talla}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="ordenarPor">Ordenar por</label>
          <select
            id="ordenarPor"
            value={filtros.ordenarPor}
            onChange={(evento) =>
              actualizarFiltro(
                'ordenarPor',
                evento.target.value,
              )
            }
          >
            <option value="fecha_inicio">Fecha inicial</option>
            <option value="cliente">Cliente</option>
            <option value="referencia">Referencia</option>
            <option value="cantidad">Cantidad</option>
            <option value="orden_compra">
              Orden de compra
            </option>
            <option value="talla">Talla</option>
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="direccion">Dirección</label>
          <select
            id="direccion"
            value={filtros.direccion}
            onChange={(evento) =>
              actualizarFiltro(
                'direccion',
                evento.target.value,
              )
            }
          >
            <option value="desc">Mayor a menor</option>
            <option value="asc">Menor a mayor</option>
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="limite">Registros por página</label>
          <select
            id="limite"
            value={filtros.limite}
            onChange={(evento) =>
              actualizarFiltro(
                'limite',
                Number(evento.target.value),
              )
            }
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="acciones-filtros">
          <button type="submit" className="boton-principal">
            Aplicar filtros
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
          Consultando información...
        </div>
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
                    <td>
                      {formatearFecha(
                        registro['Fecha inicio'],
                      )}
                    </td>
                    <td>{registro.Cliente ?? '—'}</td>
                    <td>
                      {registro['Orden de compra'] ?? '—'}
                    </td>
                    <td>{registro.Referencia ?? '—'}</td>
                    <td>{registro.Talla ?? '—'}</td>
                    <td>
                      {registro.Cantidad?.toLocaleString(
                        'es-CO',
                      ) ?? '—'}
                    </td>
                    <td>
                      {registro[
                        'Unidades despachadas'
                      ]?.toLocaleString('es-CO') ?? '—'}
                    </td>
                    <td>
                      {registro._metadatos?.hoja_origen ?? '—'}
                    </td>
                  </tr>
                ))}

                {registros.length === 0 && (
                  <tr>
                    <td colSpan={8} className="sin-resultados">
                      No se encontraron registros con los filtros
                      seleccionados.
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
              onClick={() =>
                setPagina((actual) => actual - 1)
              }
            >
              Anterior
            </button>

            <span>
              Página {pagina} de {Math.max(totalPaginas, 1)}
            </span>

            <button
              type="button"
              disabled={
                totalPaginas === 0 || pagina >= totalPaginas
              }
              onClick={() =>
                setPagina((actual) => actual + 1)
              }
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
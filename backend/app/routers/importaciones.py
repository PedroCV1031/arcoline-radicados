from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import numpy as np
import openpyxl
import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.database import client, radicados_collection


router = APIRouter(
    prefix="/api/importaciones",
    tags=["Importaciones"],
)


EXTENSIONES_PERMITIDAS = {".xlsx", ".xlsm"}
TAMANO_MAXIMO = 20 * 1024 * 1024

COLUMNAS_ESPERADAS = [
    "Fecha ingreso",
    "Fecha limite",
    "Cliente",
    "Orden de compra",
    "Referencia",
    "Talla",
    "Tipo",
    "Cantidad",
    "Unidades despachadas",
    "Fecha entrega final",
]

COLUMNAS_OBLIGATORIAS_FILA = [
    "Fecha ingreso",
    "Cliente",
    "Referencia",
    "Talla",
    "Cantidad",
]


def obtener_columnas_hoja(hoja) -> list[str]:
    if not hasattr(hoja, "iter_rows"):
        return []

    primera_fila = next(
        hoja.iter_rows(
            min_row=1,
            max_row=1,
            values_only=True,
        ),
        (),
    )

    columnas = [
        str(valor).strip()
        if valor is not None
        else None
        for valor in primera_fila
    ]

    while columnas and columnas[-1] is None:
        columnas.pop()

    return columnas


def es_hoja_valida(hoja) -> bool:
    return obtener_columnas_hoja(hoja) == COLUMNAS_ESPERADAS


def validar_archivo(
    nombre_archivo: str,
    contenido: bytes,
) -> None:
    extension = Path(nombre_archivo).suffix.lower()

    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten archivos .xlsx o .xlsm",
        )

    if not contenido:
        raise HTTPException(
            status_code=400,
            detail="El archivo está vacío",
        )

    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(
            status_code=413,
            detail="El archivo supera el límite de 20 MB",
        )


def normalizar_valor(valor):
    if valor is None:
        return None

    try:
        if pd.isna(valor):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(valor, pd.Timestamp):
        return valor.to_pydatetime()

    if isinstance(valor, np.generic):
        return valor.item()

    if isinstance(valor, str):
        valor = valor.strip()
        return valor if valor else None

    return valor


def convertir_identificador_a_texto(valor):
    valor = normalizar_valor(valor)

    if valor is None:
        return None

    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))

    return str(valor).strip() or None


def convertir_fecha(valor):
    valor = normalizar_valor(valor)

    if valor is None:
        return None

    if isinstance(valor, datetime):
        return valor

    try:
        fecha = pd.to_datetime(
            valor,
            dayfirst=True,
            errors="coerce",
        )
    except (TypeError, ValueError):
        return None

    if pd.isna(fecha):
        return None

    if isinstance(fecha, pd.Timestamp):
        return fecha.to_pydatetime()

    return fecha


def convertir_numero(valor):
    valor = normalizar_valor(valor)

    if valor is None:
        return None

    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None

    if not np.isfinite(numero):
        return None

    if numero.is_integer():
        return int(numero)

    return numero


def valor_vacio(valor) -> bool:
    return normalizar_valor(valor) is None


def procesar_hoja(
    contenido: bytes,
    nombre_archivo: str,
    nombre_hoja: str,
    lote_importacion: str,
) -> dict:
    try:
        dataframe = pd.read_excel(
            BytesIO(contenido),
            sheet_name=nombre_hoja,
            engine="openpyxl",
        )
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No fue posible procesar la hoja "
                f"'{nombre_hoja}': {error}"
            ),
        )

    if dataframe.empty:
        raise HTTPException(
            status_code=400,
            detail=f"La hoja '{nombre_hoja}' está vacía",
        )

    dataframe.columns = [
        str(columna).strip()
        for columna in dataframe.columns
    ]

    if dataframe.columns.tolist() != COLUMNAS_ESPERADAS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La hoja '{nombre_hoja}' no tiene "
                "la estructura requerida"
            ),
        )

    dataframe = dataframe[COLUMNAS_ESPERADAS]
    dataframe = dataframe.dropna(how="all")

    if dataframe.empty:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La hoja '{nombre_hoja}' no contiene "
                "registros para importar"
            ),
        )

    registros = []
    filas_rechazadas = 0
    filas_corregidas = 0
    fecha_importacion = datetime.now(timezone.utc)

    for indice, fila in dataframe.iterrows():
        registro = {
            columna: normalizar_valor(fila[columna])
            for columna in COLUMNAS_ESPERADAS
        }

        faltan_datos_obligatorios = any(
            valor_vacio(registro[columna])
            for columna in COLUMNAS_OBLIGATORIAS_FILA
        )

        if faltan_datos_obligatorios:
            filas_rechazadas += 1
            continue

        fecha_ingreso = convertir_fecha(
            registro["Fecha ingreso"]
        )

        if fecha_ingreso is None:
            filas_rechazadas += 1
            continue

        fecha_limite_original = registro["Fecha limite"]
        fecha_entrega_original = registro[
            "Fecha entrega final"
        ]

        fecha_limite = convertir_fecha(
            fecha_limite_original
        )

        fecha_entrega = convertir_fecha(
            fecha_entrega_original
        )

        if (
            not valor_vacio(fecha_limite_original)
            and fecha_limite is None
        ):
            filas_rechazadas += 1
            continue

        if (
            not valor_vacio(fecha_entrega_original)
            and fecha_entrega is None
        ):
            filas_rechazadas += 1
            continue

        cantidad = convertir_numero(
            registro["Cantidad"]
        )

        if cantidad is None or cantidad <= 0:
            filas_rechazadas += 1
            continue

        despachadas_original = registro[
            "Unidades despachadas"
        ]

        unidades_despachadas = convertir_numero(
            despachadas_original
        )

        if (
            not valor_vacio(despachadas_original)
            and unidades_despachadas is None
        ):
            filas_rechazadas += 1
            continue

        if (
            unidades_despachadas is not None
            and unidades_despachadas < 0
        ):
            filas_rechazadas += 1
            continue

        if (
            unidades_despachadas is not None
            and unidades_despachadas > cantidad
        ):
            unidades_despachadas = cantidad
            filas_corregidas += 1

        registro["Fecha ingreso"] = fecha_ingreso
        registro["Fecha limite"] = fecha_limite
        registro["Fecha entrega final"] = fecha_entrega

        registro["Cliente"] = (
            convertir_identificador_a_texto(
                registro["Cliente"]
            )
        )

        registro["Orden de compra"] = (
            convertir_identificador_a_texto(
                registro["Orden de compra"]
            )
        )

        registro["Referencia"] = (
            convertir_identificador_a_texto(
                registro["Referencia"]
            )
        )

        registro["Talla"] = (
            convertir_identificador_a_texto(
                registro["Talla"]
            )
        )

        registro["Tipo"] = (
            convertir_identificador_a_texto(
                registro["Tipo"]
            )
        )

        registro["Cantidad"] = cantidad
        registro["Unidades despachadas"] = (
            unidades_despachadas
        )

        registro["_metadatos"] = {
            "archivo_origen": nombre_archivo,
            "hoja_origen": nombre_hoja,
            "fila_origen": int(indice) + 2,
            "fecha_importacion": fecha_importacion,
            "lote_importacion": lote_importacion,
        }

        registros.append(registro)

    if not registros:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La hoja '{nombre_hoja}' no contiene "
                "ninguna fila válida. No se modificó MongoDB."
            ),
        )

    return {
        "registros": registros,
        "filas_leidas": len(dataframe),
        "filas_rechazadas": filas_rechazadas,
        "filas_corregidas": filas_corregidas,
    }


@router.post("/hojas")
async def consultar_hojas(
    archivo: UploadFile = File(...),
):
    nombre_archivo = Path(archivo.filename or "").name
    contenido = await archivo.read()

    validar_archivo(nombre_archivo, contenido)

    libro = None

    try:
        libro = openpyxl.load_workbook(
            BytesIO(contenido),
            read_only=True,
            data_only=True,
        )

        hojas_validas = [
            nombre_hoja
            for nombre_hoja in libro.sheetnames
            if es_hoja_valida(libro[nombre_hoja])
        ]

        if not hojas_validas:
            raise HTTPException(
                status_code=400,
                detail=(
                    "El archivo no contiene hojas con "
                    "la estructura requerida"
                ),
            )

        return {
            "archivo": nombre_archivo,
            "total_hojas_validas": len(hojas_validas),
            "hojas_validas": hojas_validas,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"No fue posible leer el archivo: {error}",
        )

    finally:
        if libro is not None:
            libro.close()


@router.post("/cargar")
async def cargar_hojas(
    archivo: UploadFile = File(...),
    hojas: list[str] = Form(...),
    confirmar: bool = Form(False),
):
    if not confirmar:
        raise HTTPException(
            status_code=400,
            detail="Debe confirmar el reemplazo de las hojas",
        )

    nombre_archivo = Path(archivo.filename or "").name
    contenido = await archivo.read()

    validar_archivo(nombre_archivo, contenido)

    hojas_separadas = []

    for valor in hojas:
        hojas_separadas.extend(
            hoja.strip()
            for hoja in valor.split(",")
            if hoja.strip()
        )

    hojas_seleccionadas = list(
        dict.fromkeys(hojas_separadas)
    )

    if not hojas_seleccionadas:
        raise HTTPException(
            status_code=400,
            detail="Debe seleccionar al menos una hoja",
        )

    libro = None

    try:
        libro = openpyxl.load_workbook(
            BytesIO(contenido),
            read_only=True,
            data_only=True,
        )

        hojas_disponibles = set(libro.sheetnames)

        hojas_validas = {
            nombre_hoja
            for nombre_hoja in libro.sheetnames
            if es_hoja_valida(libro[nombre_hoja])
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"No fue posible abrir el archivo: {error}",
        )

    finally:
        if libro is not None:
            libro.close()

    hojas_invalidas = [
        hoja
        for hoja in hojas_seleccionadas
        if (
            hoja not in hojas_disponibles
            or hoja not in hojas_validas
        )
    ]

    if hojas_invalidas:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": (
                    "Hay hojas inexistentes o no permitidas"
                ),
                "hojas_invalidas": hojas_invalidas,
            },
        )

    lote_importacion = str(uuid4())
    resultados_por_hoja = {}

    # Primero procesa todo. MongoDB todavía no se modifica.
    for hoja in hojas_seleccionadas:
        resultados_por_hoja[hoja] = procesar_hoja(
            contenido=contenido,
            nombre_archivo=nombre_archivo,
            nombre_hoja=hoja,
            lote_importacion=lote_importacion,
        )

    resultado_hojas = []

    try:
        with client.start_session() as sesion:
            with sesion.start_transaction():
                for hoja, resultado in (
                    resultados_por_hoja.items()
                ):
                    registros = resultado["registros"]

                    eliminacion = (
                        radicados_collection.delete_many(
                            {
                                "_metadatos.hoja_origen": hoja,
                            },
                            session=sesion,
                        )
                    )

                    insercion = (
                        radicados_collection.insert_many(
                            registros,
                            session=sesion,
                        )
                    )

                    resultado_hojas.append({
                        "hoja": hoja,
                        "filas_leidas": (
                            resultado["filas_leidas"]
                        ),
                        "filas_rechazadas": (
                            resultado["filas_rechazadas"]
                        ),
                        "filas_corregidas": (
                            resultado["filas_corregidas"]
                        ),
                        "registros_eliminados": (
                            eliminacion.deleted_count
                        ),
                        "registros_insertados": len(
                            insercion.inserted_ids
                        ),
                    })

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "No fue posible reemplazar las hojas en "
                f"MongoDB: {error}"
            ),
        )

    return {
        "mensaje": "Importación completada correctamente",
        "archivo": nombre_archivo,
        "lote_importacion": lote_importacion,
        "hojas_procesadas": resultado_hojas,
        "total_insertados": sum(
            resultado["registros_insertados"]
            for resultado in resultado_hojas
        ),
        "total_eliminados": sum(
            resultado["registros_eliminados"]
            for resultado in resultado_hojas
        ),
        "total_rechazados": sum(
            resultado["filas_rechazadas"]
            for resultado in resultado_hojas
        ),
        "total_corregidos": sum(
            resultado["filas_corregidas"]
            for resultado in resultado_hojas
        ),
    }
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import (
    obtener_usuario_actual,
    router as auth_router,
)
from app.database import client
from app.routers import (
    configuracion,
    importaciones,
    radicados,
    ventas,
)


load_dotenv()

app = FastAPI(
    title="API Radicados Arcoline",
    version="1.0.0",
)

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

app.include_router(
    radicados.router,
    dependencies=[Depends(obtener_usuario_actual)],
)

app.include_router(
    importaciones.router,
    dependencies=[Depends(obtener_usuario_actual)],
)

app.include_router(
    ventas.router,
    dependencies=[Depends(obtener_usuario_actual)],
)

app.include_router(
    configuracion.router,
    dependencies=[Depends(obtener_usuario_actual)],
)


@app.get("/")
def inicio():
    return {
        "aplicacion": "Radicados Arcoline",
        "estado": "activa",
    }


@app.get(
    "/api/health",
    dependencies=[Depends(obtener_usuario_actual)],
)
def verificar_conexion():
    client.admin.command("ping")

    return {
        "api": "activa",
        "mongodb": "conectado",
    }
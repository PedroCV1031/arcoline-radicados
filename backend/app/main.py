import os
from app.routers import radicados

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import client

load_dotenv()

app = FastAPI(
    title="API Radicados Arcoline",
    version="1.0.0"
)

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(radicados.router)
@app.get("/")
def inicio():
    return {
        "aplicacion": "Radicados Arcoline",
        "estado": "activa"
    }


@app.get("/api/health")
def verificar_conexion():
    client.admin.command("ping")

    return {
        "api": "activa",
        "mongodb": "conectado"
    }
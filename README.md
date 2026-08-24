# Arcoline Radicados

Aplicación web interna para administrar los radicados de producción de Arcoline. Permite consultar la información almacenada en MongoDB Atlas, importar hojas válidas desde archivos Excel y analizar las unidades radicadas por semana y referencia.

## Aplicación desplegada

- Frontend: [arcoline-radicados.vercel.app](https://arcoline-radicados.vercel.app)
- Backend: [arcoline-radicados.onrender.com](https://arcoline-radicados.onrender.com)
- Documentación de la API: [arcoline-radicados.onrender.com/docs](https://arcoline-radicados.onrender.com/docs)

El acceso a las funciones de la plataforma requiere autenticación.

## Funcionalidades

- Inicio y cierre de sesión mediante una cookie segura `HttpOnly`.
- Consulta paginada de los radicados alojados en MongoDB.
- Filtros por fechas, cliente, orden de compra, referencia, talla y hoja de origen.
- Ordenamiento de registros y selección de la cantidad de resultados por página.
- Carga de archivos Excel `.xlsx` y `.xlsm` de hasta 20 MB.
- Detección automática de las hojas que cumplen la estructura requerida.
- Selección de una o varias hojas antes de importar.
- Reemplazo de los registros existentes correspondientes a las hojas seleccionadas.
- Metadatos de trazabilidad para cada registro importado.
- Resumen de ventas semanales agrupadas por referencia, sin separar por talla.
- Filtros de ventas por periodo, cliente y referencia.
- Selección de referencias visibles y agrupación de las demás como `OTRAS`.
- Visualización mediante barras, líneas u otros tipos de gráfica disponibles en la interfaz.
- Tablas con el detalle de los resultados.

## Tecnologías

### Backend

- Python
- FastAPI
- Uvicorn
- PyMongo
- Pandas
- OpenPyXL
- MongoDB Atlas
- Autenticación con JWT y hash Argon2

### Frontend

- React
- TypeScript
- Vite
- Axios
- React Router
- Recharts

### Despliegue

- Render para la API FastAPI.
- Vercel para el frontend.
- MongoDB Atlas para la base de datos.
- GitHub para control de versiones e integración con los despliegues.

## Estructura principal

```text
arcoline-radicados/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── importaciones.py
│   │   │   ├── radicados.py
│   │   │   └── ventas.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── pages/
│   │   │   ├── ImportacionPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RadicadosPage.tsx
│   │   │   └── VentasSemanalesPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
├── .gitignore
└── README.md
```

## Requisitos para desarrollo

- Python 3.11 o superior.
- Node.js 20 o superior.
- npm.
- Acceso a un proyecto de MongoDB Atlas.
- Git.

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/PedroCV1031/arcoline-radicados.git
cd arcoline-radicados
```

### 2. Configurar el backend

En PowerShell:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Completar `backend/.env` con valores locales válidos:

```env
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/
MONGODB_DATABASE=arcoline_db
MONGODB_COLLECTION=radicados
FRONTEND_URL=http://localhost:5173

APP_USERNAME=usuario_de_la_aplicacion
APP_PASSWORD_HASH=hash_argon2
JWT_SECRET_KEY=clave_secreta_larga_y_aleatoria
SESSION_HOURS=8
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

Iniciar la API desde la carpeta `backend`:

```powershell
uvicorn app.main:app --reload
```

La API local estará disponible en:

```text
http://127.0.0.1:8000
```

La documentación interactiva estará en:

```text
http://127.0.0.1:8000/docs
```

### 3. Configurar el frontend

En otra terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Contenido de `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Iniciar el frontend:

```powershell
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## Variables de entorno

### Backend

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión privada a MongoDB Atlas. |
| `MONGODB_DATABASE` | Nombre de la base de datos. |
| `MONGODB_COLLECTION` | Nombre de la colección de radicados. |
| `FRONTEND_URL` | Origen exacto autorizado por CORS, sin `/` al final. |
| `APP_USERNAME` | Usuario de acceso a la plataforma. |
| `APP_PASSWORD_HASH` | Hash Argon2 de la contraseña; nunca debe contener la contraseña en texto plano. |
| `JWT_SECRET_KEY` | Clave larga y aleatoria utilizada para firmar las sesiones. |
| `SESSION_HOURS` | Duración de la sesión en horas. |
| `COOKIE_SECURE` | `false` en desarrollo local y `true` bajo HTTPS. |
| `COOKIE_SAMESITE` | `lax` en local y `none` cuando frontend y backend están en dominios diferentes. |

### Frontend

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API, sin `/` al final. |

Los archivos `.env` no deben subirse al repositorio. Solo los archivos `.env.example`, sin secretos, deben permanecer versionados.

## Estructura requerida del Excel

El archivo debe tener extensión `.xlsx` o `.xlsm` y un tamaño máximo de 20 MB.

Una hoja se considera válida únicamente cuando su primera fila contiene exactamente estas columnas y en este orden:

1. `Fecha inicio`
2. `Fecha limite`
3. `Cliente`
4. `Orden de compra`
5. `Referencia`
6. `Talla`
7. `Cantidad`
8. `Unidades despachadas`
9. `Fecha entrega final`

Las hojas que no cumplen esta estructura no se presentan como opciones de importación. Las hojas `SEPT 2026` y `OCT 2026` del archivo de referencia son ejemplos de la estructura válida.

### Comportamiento de la importación

1. El usuario selecciona el archivo.
2. El backend identifica solamente las hojas válidas.
3. El usuario selecciona las hojas que desea cargar.
4. La plataforma solicita confirmación explícita.
5. Por cada hoja seleccionada, se reemplazan en MongoDB los registros cuya hoja de origen coincide.
6. Se insertan los registros nuevos junto con sus metadatos de trazabilidad.

Cada documento importado incluye:

```json
{
  "_metadatos": {
    "archivo_origen": "RADICADO ARCOLINE 2024.xlsx",
    "hoja_origen": "OCT 2026",
    "fila_origen": 1173,
    "fecha_importacion": "fecha ISO",
    "lote_importacion": "identificador UUID"
  }
}
```

## Endpoints principales

### Autenticación

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/autenticacion/login` | Inicia la sesión. |
| `POST` | `/api/autenticacion/logout` | Cierra la sesión. |
| `GET` | `/api/autenticacion/me` | Comprueba la sesión actual. |

### Radicados

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/radicados` | Consulta paginada, filtrada y ordenada. |
| `GET` | `/api/radicados/opciones-filtros` | Devuelve las opciones disponibles para los filtros. |

### Importaciones

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/importaciones/hojas` | Analiza el archivo y devuelve sus hojas válidas. |
| `POST` | `/api/importaciones/cargar` | Reemplaza e importa las hojas confirmadas. |

### Ventas

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/ventas/semanales` | Agrupa las unidades por semana y referencia. |

### Estado

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/` | Indica que la aplicación está activa. |
| `GET` | `/api/health` | Comprueba la API y la conexión con MongoDB. |

## Verificaciones antes de subir cambios

### Backend

```powershell
cd backend
python -m compileall app
```

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

### Repositorio

```powershell
git status
git diff --check
```

## Despliegue

### Render

Configuración del servicio web:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

En producción deben configurarse, entre otras, estas variables:

```env
FRONTEND_URL=https://arcoline-radicados.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

Los rangos de IP de salida del servicio de Render deben estar autorizados en **MongoDB Atlas → Security → Network Access**.

### Vercel

Configuración del proyecto:

```text
Framework: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Variable de producción:

```env
VITE_API_URL=https://arcoline-radicados.onrender.com
```

Después de cambiar una variable `VITE_*` es necesario volver a desplegar el frontend.

## Flujo de trabajo con Git

Crear una rama desde `main` para cada cambio:

```powershell
git switch main
git pull
git switch -c desarrollo/nombre-del-cambio
```

Después de verificar el cambio:

```powershell
git add .
git commit -m "Descripción clara del cambio"
git push -u origin desarrollo/nombre-del-cambio
```

Finalmente, crear un Pull Request hacia `main`. Los despliegues de producción se actualizan a partir de la rama `main`.

## Seguridad

- No guardar credenciales, hashes reales, tokens o cadenas de conexión en GitHub.
- Mantener `backend/.env` y `frontend/.env` ignorados por Git.
- Utilizar HTTPS y cookies seguras en producción.
- Limitar en Atlas el acceso de red a las direcciones necesarias.
- Cambiar periódicamente las credenciales y la clave de firma de las sesiones.
- No compartir capturas que expongan variables de entorno o cadenas de conexión.

## Uso interno

Este proyecto fue desarrollado para la gestión interna de la producción de Arcoline. No se distribuye bajo una licencia de código abierto.

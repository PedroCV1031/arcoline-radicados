# Arcoline Radicados

Aplicación web interna para gestionar los radicados de producción de Arcoline. Permite importar información desde Excel, consultar los registros almacenados en MongoDB Atlas, controlar el estado de las entregas y analizar la producción semanal por referencia.

## Aplicación desplegada

- Frontend: [arcoline-radicados.vercel.app](https://arcoline-radicados.vercel.app)
- Backend: [arcoline-radicados.onrender.com](https://arcoline-radicados.onrender.com)
- Documentación de la API: [arcoline-radicados.onrender.com/docs](https://arcoline-radicados.onrender.com/docs)

Todas las funciones de la plataforma requieren autenticación.

## Funcionalidades

### Autenticación

- Inicio y cierre de sesión.
- Sesiones firmadas mediante JWT.
- Almacenamiento del token en una cookie segura `HttpOnly`.
- Contraseña almacenada como hash Argon2.
- Protección de los endpoints de la aplicación.

### Importación de Excel

- Carga de archivos `.xlsx` y `.xlsm` de hasta 20 MB.
- Detección automática de las hojas que cumplen la estructura requerida.
- Selección de una o varias hojas válidas.
- Reemplazo de los registros existentes de cada hoja seleccionada.
- Validación individual de las filas antes de insertarlas.
- Rechazo de filas incompletas o con valores inválidos.
- Corrección automática de unidades despachadas superiores a la cantidad recibida.
- Resumen de filas leídas, rechazadas, corregidas, eliminadas e insertadas.
- Metadatos de trazabilidad para cada registro importado.

### Consulta de radicados

- Tabla paginada de los registros almacenados en MongoDB.
- Visualización de fecha de ingreso, fecha límite y fecha de entrega.
- Visualización de cliente, orden de compra, referencia, talla, tipo, cantidades, unidades pendientes, estado y hoja de origen.
- Filtros por cliente, orden de compra, referencia, talla, tipo, hoja de origen, fechas de ingreso y estado.
- Ordenamiento ascendente o descendente por diferentes campos.
- Selección de la cantidad de registros por página.
- Colores diferenciados para representar el estado de cada radicado.
- Configuración persistente de los días considerados como entrega próxima.

### Producción semanal

- Agrupación de unidades por semana y referencia, sin separar automáticamente por talla.
- Filtros por periodo, cliente, referencia, talla y tipo.
- Inclusión de semanas sin producción dentro del periodo seleccionado.
- Selección de la cantidad de referencias visibles.
- Agrupación de las referencias restantes como `OTRAS`.
- Gráficas de barras apiladas, barras agrupadas, líneas y torta.
- La gráfica de torta se limita a una sola semana.
- Tablas paginadas con el detalle semanal y los totales por referencia.
- Fechas iniciales configuradas automáticamente con el mes actual.

## Reglas de filtros dependientes

Los filtros de referencia, talla y tipo respetan estas reglas:

- Sin referencia seleccionada, los filtros de talla y tipo permanecen deshabilitados.
- Con una referencia específica, se habilitan talla y tipo.
- Las tallas disponibles corresponden únicamente a la referencia seleccionada.
- Al seleccionar referencia y talla, los tipos disponibles corresponden a esa combinación.
- La opción de todas las referencias permite filtrar por tipo sin exigir una talla.

## Estados de los radicados

Un radicado se considera entregado cuando las unidades despachadas son iguales o superiores a la cantidad recibida. Las unidades pendientes se calculan como:

```text
máximo(Cantidad - Unidades despachadas, 0)
```

Los estados disponibles son:

| Estado | Condición |
|---|---|
| `En proceso` | No ha sido entregado y no está próximo a vencer, o no tiene fecha límite. |
| `Entrega próxima` | No ha sido entregado y su fecha límite está dentro del número de días configurado. |
| `Vencido sin entregar` | No ha sido entregado y la fecha límite ya pasó. |
| `Entregado` | Fue completado y no tiene fecha límite. |
| `Entregado a tiempo` | La fecha de entrega es anterior o igual a la fecha límite. |
| `Entregado tarde` | La fecha de entrega es posterior a la fecha límite. |
| `Entregado sin fecha` | Las unidades fueron completadas, pero falta la fecha de entrega necesaria para comparar con la fecha límite. |

El valor inicial para considerar una entrega próxima es de 3 días. Puede modificarse desde la página de radicados y el nuevo valor queda almacenado en MongoDB como configuración general.

## Tecnologías

### Backend

- Python 3.11+
- FastAPI
- Uvicorn
- PyMongo
- Pandas
- OpenPyXL
- MongoDB Atlas
- JWT
- Argon2

### Frontend

- React
- TypeScript
- Vite
- Axios
- React Router
- Recharts

### Infraestructura

- Render para la API.
- Vercel para el frontend.
- MongoDB Atlas para los datos y la configuración general.
- GitHub para control de versiones e integración con los despliegues.

## Estructura principal

```text
arcoline-radicados/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── configuracion.py
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
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vercel.json
├── .gitignore
└── README.md
```

## Requisitos para desarrollo

- Python 3.11 o superior.
- Node.js 20 o superior.
- npm.
- Git.
- Acceso a un proyecto de MongoDB Atlas.

## Instalación local

### 1. Clonar el repositorio

```powershell
git clone https://github.com/PedroCV1031/arcoline-radicados.git
cd arcoline-radicados
```

### 2. Configurar el backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Completar `backend/.env` con valores válidos:

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

Iniciar la API desde `backend`:

```powershell
uvicorn app.main:app --reload
```

La API estará disponible en `http://127.0.0.1:8000` y su documentación en `http://127.0.0.1:8000/docs`.

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

Abrir `http://localhost:5173`.

## Variables de entorno

### Backend

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión privada a MongoDB Atlas. |
| `MONGODB_DATABASE` | Nombre de la base de datos. |
| `MONGODB_COLLECTION` | Nombre de la colección de radicados. |
| `FRONTEND_URL` | Origen exacto autorizado por CORS, sin `/` al final. |
| `APP_USERNAME` | Usuario de acceso a la plataforma. |
| `APP_PASSWORD_HASH` | Hash Argon2 de la contraseña. Nunca debe contener la contraseña en texto plano. |
| `JWT_SECRET_KEY` | Clave larga y aleatoria usada para firmar las sesiones. |
| `SESSION_HOURS` | Duración de la sesión en horas. |
| `COOKIE_SECURE` | `false` en desarrollo local y `true` bajo HTTPS. |
| `COOKIE_SAMESITE` | `lax` en local y `none` cuando frontend y backend usan dominios diferentes. |

### Frontend

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API, sin `/` al final. |

Los archivos `.env` nunca deben subirse al repositorio. Solo deben versionarse los archivos `.env.example`, sin secretos reales.

## Estructura requerida del Excel

El archivo debe tener extensión `.xlsx` o `.xlsm` y un tamaño máximo de 20 MB.

Una hoja se considera válida únicamente si su primera fila contiene exactamente estas columnas y en este orden:

1. `Fecha ingreso`
2. `Fecha limite`
3. `Cliente`
4. `Orden de compra`
5. `Referencia`
6. `Talla`
7. `Tipo`
8. `Cantidad`
9. `Unidades despachadas`
10. `Fecha entrega final`

La columna `Tipo` debe existir, aunque sus celdas pueden estar vacías. Las hojas que no cumplen la estructura no se muestran como opciones de importación.

### Requisitos mínimos de cada fila

Para ser importada, una fila debe contener valores válidos en:

- `Fecha ingreso`
- `Cliente`
- `Referencia`
- `Talla`
- `Cantidad`

Las fechas y los valores numéricos también se validan. Las filas que no cumplen las reglas se rechazan sin impedir la importación de las demás.

Si `Unidades despachadas` supera a `Cantidad`, el valor se corrige automáticamente para que sea igual a `Cantidad` y la corrección se informa en el resultado de la importación.

### Comportamiento de la importación

1. El usuario selecciona un archivo.
2. El backend identifica las hojas válidas.
3. El usuario selecciona las hojas que desea cargar.
4. La plataforma solicita confirmación explícita.
5. Cada hoja se valida completamente antes de modificar MongoDB.
6. Se eliminan los documentos cuya hoja de origen coincide con la hoja seleccionada.
7. Se insertan las filas aceptadas con sus metadatos de trazabilidad.
8. La interfaz informa las filas leídas, rechazadas y corregidas, además de los registros eliminados e insertados.

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
| `POST` | `/api/autenticacion/login` | Inicia una sesión. |
| `POST` | `/api/autenticacion/logout` | Cierra la sesión. |
| `GET` | `/api/autenticacion/me` | Comprueba la sesión actual. |

### Radicados

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/radicados` | Consulta paginada, filtrada y ordenada. |
| `GET` | `/api/radicados/opciones-filtros` | Obtiene las opciones disponibles para los filtros dependientes. |

### Importaciones

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/importaciones/hojas` | Analiza un archivo y devuelve sus hojas válidas. |
| `POST` | `/api/importaciones/cargar` | Valida, reemplaza e importa las hojas confirmadas. |

### Producción semanal

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/ventas/semanales` | Agrupa las unidades por semana y referencia. |

### Configuración

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/configuracion/entregas` | Consulta los días configurados para entregas próximas. |
| `PUT` | `/api/configuracion/entregas` | Actualiza y conserva la configuración en MongoDB. |

### Estado del servicio

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

Variables relevantes de producción:

```env
FRONTEND_URL=https://arcoline-radicados.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

También deben configurarse en Render las credenciales de MongoDB, el usuario de la aplicación, el hash de la contraseña y la clave JWT. Los rangos de IP de salida de Render deben estar autorizados en **MongoDB Atlas → Security → Network Access**.

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

Después de modificar una variable `VITE_*`, debe desplegarse nuevamente el frontend.

## Flujo de trabajo con Git

Crear una rama desde `main`:

```powershell
git switch main
git pull
git switch -c desarrollo/nombre-del-cambio
```

Después de verificar los cambios:

```powershell
git add .
git commit -m "Descripción clara del cambio"
git push -u origin desarrollo/nombre-del-cambio
```

Crear un Pull Request hacia `main`. Los despliegues de producción se actualizan a partir de esa rama.

## Seguridad

- No guardar credenciales, hashes reales, tokens ni cadenas de conexión en GitHub.
- Mantener `backend/.env` y `frontend/.env` ignorados por Git.
- Usar HTTPS y cookies seguras en producción.
- Restringir en MongoDB Atlas el acceso de red a las direcciones necesarias.
- Cambiar periódicamente las credenciales y la clave de firma de las sesiones.
- Evitar mostrar errores internos de MongoDB o datos sensibles en la interfaz.
- No compartir capturas que expongan variables de entorno o cadenas de conexión.

## Uso interno

Este proyecto fue desarrollado para la gestión interna de la producción de Arcoline. No se distribuye bajo una licencia de código abierto.

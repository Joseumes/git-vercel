# Proyecto web con autenticación por API

Este repositorio contiene la web de login/registro y la estructura base de una API Node.js para autenticar usuarios con Supabase.

## Estructura

- `index.html` — formulario de acceso
- `css/styles.css` — estilos del login
- `js/app.js` — lógica del frontend
- `js/config.js` — configuración de la API
- `api/` — backend Node.js con Express y Supabase

## API

La API está en la carpeta `api/` y expone estos endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /health`

## Instalación local de la API

```bash
cd api
npm install
cp .env.example .env
```

Completa las variables de entorno con tus claves reales de Supabase.

## Ejecutar la API localmente

```bash
cd api
npm run dev
```

La API quedará disponible en:

- `http://localhost:3001`

## Ejecutar la web localmente

Puedes abrir `index.html` directamente o servirla con un servidor local, por ejemplo:

```bash
python3 -m http.server 5500
```

Y luego visita:

- `http://localhost:5500`

## Deploy en producción

### Frontend (Vercel)

Sube este repositorio a Vercel como un proyecto estático.

### Backend (Render)

Sube la carpeta `api/` a Render como servicio web Node.js y usa estas variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `APP_URL` = URL de tu frontend en Vercel
- `ALLOWED_ORIGINS` = `https://tu-frontend.vercel.app`
- `PORT` = `10000` (Render lo asigna automaticamente)

Luego cambia en `js/config.js` la URL base:

```js
const API_BASE_URL = "https://tu-api.onrender.com";
```

## Nota importante

Si tu cuenta de Supabase tiene la autenticación en modo de confirmación por email, el registro debe confirmarse desde el correo antes de empezar a usar la sesión.

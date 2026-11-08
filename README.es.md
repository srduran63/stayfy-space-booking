# Stayfy

Reservas al instante — encuentra y reserva espacios (estudios, oficinas, salas de reuniones, coworking, eventos).

Stack: **React 19 + Vite + TypeScript + Tailwind CSS v4 + Supabase** (Auth, Postgres, RLS).

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto en Supabase

1. Ve a [app.supabase.com](https://app.supabase.com) y crea un proyecto nuevo (gratuito).
2. En **Project Settings → API** copia la **Project URL** y la **anon public key**.
3. Copia `.env.example` como `.env` y pega esos valores:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

### 3. Crear las tablas

En el **SQL Editor** de Supabase, pega y ejecuta el contenido completo de [`supabase/schema.sql`](supabase/schema.sql). Esto crea:

- `profiles` (perfil de usuario, con trigger que lo crea automáticamente al registrarse)
- `spaces` (catálogo de espacios reservables, con datos de ejemplo)
- `bookings` (reservas), con Row Level Security activado en las tres tablas

### 4. Habilitar inicio de sesión con Google (opcional)

En **Authentication → Providers → Google**, actívalo y configura el Client ID/Secret de un proyecto en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (Authorized redirect URI: la que te indica Supabase en esa misma pantalla). Si no lo configuras, el botón "Continuar con Google" mostrará un error pero el login/registro por correo funciona igual.

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`. Si `.env` no está configurado verás un aviso ámbar indicándolo.

### 6. Build de producción

```bash
npm run build
npm run preview
```

## Estructura

```
src/
  components/   Header, modales de auth/perfil/detalle de espacio, tarjetas
  context/      AuthContext (sesión + perfil de Supabase), ToastContext
  lib/          cliente de Supabase, helpers
  pages/        Landing, Dashboard (búsqueda + catálogo + reservas)
supabase/
  schema.sql    tablas, políticas RLS, datos de ejemplo
legacy/
  stayfy_limpio.html   prototipo estático original (referencia de diseño)
```

## Funcionalidad actual

- Registro / inicio de sesión con correo y contraseña, y con Google (vía Supabase Auth).
- Perfil editable (nombre, teléfono), persistido en la tabla `profiles`.
- Catálogo de espacios con búsqueda por texto (título/ciudad) y filtro por categoría.
- Reserva al instante: seleccionar fecha, hora y duración crea una fila en `bookings` y se ve en "Mis próximas reservas".

## Fuera de alcance por ahora

- Cobro/pago real (Stripe u otro procesador).
- Panel de anfitrión para publicar espacios propios desde la UI (los espacios se administran hoy vía SQL/Supabase Studio).
- Historial completo de reservas pasadas, cancelaciones y valoraciones.

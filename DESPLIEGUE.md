# Publicar W Experiencias en internet (gratis)

Arquitectura: **frontend en Vercel** + **backend y base de datos en Render**. Ambos se actualizan solos cada vez que subes cambios a GitHub.

## 0. Antes de empezar
1. El código debe estar en GitHub (en la raíz del repositorio deben verse las carpetas `backend` y `frontend` y el archivo `render.yaml`).
2. Crea cuenta (puedes entrar con GitHub) en https://render.com y en https://vercel.com.

## 1. Backend en Render
1. Render → **New +** → **Blueprint** → elige tu repositorio → **Apply**.
2. Te pedirá dos variables. Por ahora escribe en ambas `https://temporal.vercel.app` (las cambias en el paso 3):
   - `CORS_ALLOWED_ORIGINS`
   - `FRONTEND_URL`
3. Espera a que termine (5–10 min). Copia la URL del servicio, parecida a `https://wexperiencias-api.onrender.com`.
4. Comprueba que abre: `https://TU-API.onrender.com/api/v1/health/` debe mostrar `{"status":"ok"}`.
   La documentación está en `/api/docs/`.

## 2. Frontend en Vercel
1. Vercel → **Add New… → Project** → importa el mismo repositorio.
2. **Root Directory:** `frontend` (muy importante). Framework: Vite (lo detecta solo).
3. En **Environment Variables** agrega:
   - `VITE_API_URL` = `https://TU-API.onrender.com/api/v1`  (la URL del paso 1, terminando en `/api/v1`)
4. **Deploy**. Vercel te dará una dirección como `https://wexperiencias.vercel.app`.

## 3. Conectar ambos
En Render → tu servicio → **Environment**, cambia:
- `CORS_ALLOWED_ORIGINS` = `https://wexperiencias.vercel.app` (tu dirección de Vercel, sin `/` final)
- `FRONTEND_URL` = la misma dirección

Guarda: Render reinicia solo. Abre tu dirección de Vercel: ya funciona.
Usuarios de prueba (se cargan solos con `SEED_DEMO=true`): `huesped`, `anfitrion`, `admin`, clave `demo1234`.
**Antes de mostrarlo públicamente** cambia `SEED_DEMO` a `false` y cambia las claves de esos usuarios desde `/admin/`.

## Limitaciones del plan gratis (importante)
- Render **duerme** el backend tras 15 minutos sin visitas: la primera carga después tarda ~1 minuto.
- La base PostgreSQL gratuita de Render **caduca a los 30 días**. Para algo permanente usa un plan de pago o una base gratuita en Neon/Supabase (pega su URL en `DATABASE_URL`).
- Las **fotos subidas** desde el panel se pierden al reiniciar/redesplegar (el disco es temporal). Usa el campo de foto por URL, o un disco de pago.
- Para tener un dominio propio (ej. `wexperiencias.cl`) agrégalo en Vercel → Settings → Domains y luego ponlo en `CORS_ALLOWED_ORIGINS`.

## Si algo falla
- Pantalla sin ofertas / error de red: revisa `VITE_API_URL` (debe terminar en `/api/v1`) y vuelve a desplegar en Vercel (las variables solo se aplican en un nuevo deploy).
- Error de CORS en la consola del navegador: `CORS_ALLOWED_ORIGINS` no coincide exactamente con tu dirección de Vercel.
- Logs del backend: Render → servicio → **Logs**.

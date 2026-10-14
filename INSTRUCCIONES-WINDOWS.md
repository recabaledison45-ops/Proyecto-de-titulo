# Cómo ejecutar W Experiencias en Windows (PowerShell)

Necesitas Python 3.12+ y Node 20+. Abre **dos** terminales dentro de esta carpeta.

## Terminal 1 · Backend
```powershell
cd backend
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```
(Si PowerShell bloquea el activate: `Set-ExecutionPolicy -Scope Process Bypass`.)

## Terminal 2 · Frontend
```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

Usuarios de prueba (clave `demo1234`): `huesped` (reserva), `anfitrion` (publica y gestiona), `admin` (http://127.0.0.1:8000/admin/).

Documentación de la API: http://127.0.0.1:8000/api/docs/

## Notas
- Las fotos de ejemplo vienen de picsum.photos (necesitan internet). Si una oferta no tiene foto se muestra un degradado.
- Pruebas del backend: `python manage.py test` (67 pruebas).
- Compilar el frontend para producción: `npm run build` (queda en `frontend/dist`).

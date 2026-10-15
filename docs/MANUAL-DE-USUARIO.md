# Manual de usuario · W Experiencias (F-65)

W Experiencias reúne **alojamientos, paquetes turísticos, guías locales y actividades** del Maule en un solo lugar.
Hay tres tipos de usuario: **visitante** (sin cuenta), **huésped** (reserva) y **anfitrión** (publica y gestiona).

---
## Parte 1 · Para huéspedes

### 1.1 Buscar una experiencia
1. En la portada, escriba **a dónde** quiere ir (ej. *Talca*, *Constitución*), las **fechas** y el **número de personas** y pulse **Buscar**.
2. También puede navegar por las **categorías** de la portada (Alojamiento, Paquetes, Guías, Actividades) o buscar por texto
   libre (*kayak*, *vino*, *casona*).
3. En **Explorar** verá la lista y el **mapa** a la vez. Al mover el mapa, la lista se actualiza con lo que hay en esa zona.
   En el celular, el botón **Mapa / Lista** alterna entre ambos.
4. Los filtros (categoría, fechas, personas, dificultad) quedan en la dirección de la página: puede copiarla y compartirla.
5. Si las fechas elegidas ya están ocupadas, la oferta no aparece.

### 1.2 Guardar favoritos
Pulse el **corazón** de una tarjeta o de la ficha. Sus favoritos están en **Favoritos** (menú de arriba) y se guardan en este
navegador; si cambia de computador o borra los datos del navegador, no se conservan.

### 1.3 Crear su cuenta
**Crear cuenta** → elija un nombre de usuario, su correo y una contraseña de al menos 8 caracteres → rol **Huésped**.
Si ya tiene cuenta, **Ingresar**. Para cerrar sesión: menú de su cuenta (arriba a la derecha) → **Cerrar sesión**.

### 1.4 Reservar
1. Abra la oferta y revise fotos, descripción, ubicación, ficha técnica (duración, dificultad, qué llevar) y reseñas.
2. En el cuadro **Reservar**, elija **llegada y salida** en el calendario (los días tachados no están disponibles) y el
   número de personas. El **total** se calcula al instante.
3. Pulse **Reservar**. La reserva queda **Pendiente** y el anfitrión recibe un aviso.
4. Si no inicia sesión antes, el sistema le pedirá ingresar y le devolverá a la oferta.

> **Plazo:** una reserva pendiente que no se paga ni confirma **vence a las 48 horas** y las fechas se liberan.

### 1.5 Pagar
Las reservas se pagan por **transferencia bancaria**:
1. En **Mis reservas** pulse **Pagar** en la reserva. Verá el monto, los datos bancarios del anfitrión y una **referencia**.
2. Haga la transferencia incluyendo la referencia y luego pulse **Ya transferí**.
3. El anfitrión confirma la recepción y la reserva pasa a **Confirmada**. Recibirá un correo.

### 1.6 Cancelar y reseñar
- **Cancelar** (en Mis reservas) libera las fechas. Si ya había pagado, el pago queda marcado como **reembolsado**; la
  devolución del dinero la coordina directamente con el anfitrión.
- Cuando la experiencia termina, aparece **Reseñar**: puntúe de 1 a 5 y comente. Las reseñas son **ciegas**: se publican
  cuando usted y el anfitrión ya reseñaron, para que ninguna influya en la otra.

---
## Parte 2 · Para anfitriones

Registre su cuenta con el rol **Anfitrión**. Todo se gestiona en **Mi cuenta** (menú superior), que tiene cinco pestañas.

### 2.1 Perfil
Complete su **nombre público**, biografía, teléfono y **datos bancarios** (banco, tipo y número de cuenta, titular). Los datos
bancarios solo se muestran al huésped que reservó con usted, para que pueda transferir.

### 2.2 Publicar una oferta
**Publicar oferta** → complete:
- Título, descripción, **categoría** (alojamiento, paquete, guía, actividad) y **ciudad**.
- **Ubicación:** haga clic en el mapa donde está la experiencia.
- **Precio** (por noche, o por persona y día si el modo es *compartida*) y **máximo de personas**.
- **Modo de reserva:** *Exclusiva* (una reserva por fecha: casas, cabañas) o *Compartida* (varias reservas por fecha hasta agotar
  los cupos: tours, talleres).
- **Ficha técnica** (opcional pero recomendada): duración, dificultad, qué llevar, beneficios de bienestar.
- **Foto:** suba una imagen (JPG, PNG o WEBP, máx. 2 MB) o pegue la dirección de una foto.

### 2.3 Gestionar sus ofertas
En **Mis ofertas**: **Editar** cambia cualquier dato. Dar de baja una oferta la oculta; no se puede dar de baja si tiene
reservas vigentes.

### 2.4 Atender reservas
En **Reservas recibidas** puede filtrar por estado. Para cada reserva:
| Acción | Cuándo |
|---|---|
| **Confirmar pago** | Cuando verificó que la transferencia llegó. La reserva queda Confirmada. |
| **Rechazar** | Si no puede atender. Debe escribir un motivo; el huésped lo recibe y las fechas se liberan. |
| **Cancelar** | Para anular una reserva confirmada. Se registra el reembolso. |
| **Finalizar** | Cuando la experiencia terminó. Habilita las reseñas. |
| **Notas** | Anotaciones internas que solo usted y administración ven. |
| **Reseñar huésped** | Opinión sobre el huésped (se publica junto con la suya). |

La plataforma descuenta una **comisión del 10 %**; en cada reserva verá la comisión y el **neto** que usted recibe.

### 2.5 Reportes
En **Reportes**: reservas, ingresos y turistas **por mes** y **por oferta**, con filtro de fechas, y descarga en **CSV**
(reservas y lista de huéspedes) para su contabilidad.

---
## Parte 3 · Administración
El panel de administración está en `https://<dominio>/admin/` y es solo para el equipo técnico: permite ver y corregir
usuarios, ofertas, reservas, pagos y reseñas. Use cuentas nominales y contraseñas únicas; no comparta la cuenta.

---
## Preguntas frecuentes
**No me llegan los correos.** Revise *spam*. Si es administrador, verifique la configuración `EMAIL_*` (ver RUNBOOKS).
**Mi reserva desapareció de "pendientes".** Venció a las 48 h sin pago; puede reservar de nuevo si hay disponibilidad.
**No puedo reservar mi propia oferta.** Es intencional: un anfitrión no puede reservar lo suyo.
**Pide demasiados intentos ("429").** Espere un minuto; hay un límite de intentos de ingreso para proteger su cuenta.
**El mapa no carga.** Revise su conexión; si persiste, avise al administrador (puede ser el proveedor de mapas).
**Olvidé mi contraseña.** Esta versión **no tiene recuperación por correo**: el administrador cambia la contraseña desde `/admin/` (ver RUNBOOKS, sección 10).

# Pruebas de aceptación con la clienta — UAT (F-64a / F-64b)

> Supuesto de numeración: **F-64a** = preparar la UAT (plan, ambiente, datos, guion) y **F-64b** = ejecutarla con la clienta
> y cerrar con el acta. Si el informe define otra división, renombre los encabezados; el contenido sirve igual.
> **Este documento deja todo listo, pero la UAT en sí la hace la clienta: no se ha realizado.**

## F-64a · Preparación

### Objetivo
Que la clienta compruebe, usando el sistema como lo haría en su trabajo diario, que cumple lo que necesita, y registrar su
aceptación o los cambios solicitados.

### Participantes
| Rol | Nombre | Función en la sesión |
|---|---|---|
| Clienta (usuaria clave) | | Ejecuta los casos y decide la aceptación |
| Anfitrión de prueba (1–2 personas del rubro, si es posible) | | Ejecuta los casos de anfitrión |
| Equipo del proyecto | | Acompaña, anota hallazgos, **no guía** el uso (se observa dónde se confunde) |

### Ambiente y datos
- **Ambiente:** el entorno de pruebas desplegado en AWS (misma configuración que producción), **no** el computador del desarrollador.
  Dirección: `https://__________`
- **Datos:** cargar los datos demo en el ambiente de pruebas (`SEED_DEMO=true`) y **borrarlos antes de producción**. Usuarios: `huesped`,
  `anfitrion` (clave `demo1234`). La clienta también debe crear cuentas nuevas con su propio correo para probar los correos.
- **Dispositivos:** un computador y un celular (Android o iPhone) con el navegador que ella usa; ideal también un segundo navegador.
- **Correo:** configurar SMTP real en el ambiente de pruebas para que ella reciba las confirmaciones.
- **Antes de la sesión:** ejecutar `docs/PRUEBAS.md` completo (CI en verde) y revisar que el ambiente responda `https://__________/api/v1/health/`.

### Criterios
- **Entrada:** CI en verde sobre la versión a probar; ambiente estable; correo funcionando; guion y acta impresos o compartidos.
- **Aceptación:** todos los casos **críticos (C)** aprobados; sin hallazgos *bloqueantes*; los *mayores* con plan de corrección acordado por escrito.
- **Severidades:** *Bloqueante* (impide usar una función esencial) · *Mayor* (se puede usar pero con gran dificultad o error de negocio) ·
  *Menor* (molestia, texto, estética) · *Sugerencia* (mejora nueva; va al listado de la versión siguiente).

### Casos de prueba
Prioridad: **C** crítico · **I** importante · **D** deseable. Columna *Resultado*: ✔ aprobado · ✘ falla · — no probado.

#### Huésped
| ID | P | Caso | Pasos | Resultado esperado | Resultado | Hallazgo |
|---|---|---|---|---|---|---|
| UAT-01 | C | Encontrar una experiencia | Portada → escribir "Talca" y fechas futuras → Buscar | Se listan ofertas de Talca con precio, foto y mapa | | |
| UAT-02 | C | Filtrar por categoría | En Explorar elegir "Guías" | Solo aparecen guías; la dirección conserva el filtro | | |
| UAT-03 | I | Búsqueda por texto | Escribir "kayak" | Aparece la oferta correspondiente | | |
| UAT-04 | C | Ver el detalle | Abrir una oferta | Fotos, descripción, ubicación, ficha técnica, reseñas y cuadro de reserva | | |
| UAT-05 | I | Favoritos | Pulsar el corazón y abrir *Favoritos* | La oferta aparece y se puede quitar | | |
| UAT-06 | C | Crear cuenta de huésped | Crear cuenta con su correo | Queda con sesión iniciada | | |
| UAT-07 | C | Reservar | Elegir fechas disponibles y personas → Reservar | Reserva *Pendiente* en *Mis reservas*; el total coincide con lo mostrado | | |
| UAT-08 | C | Fechas ocupadas | Intentar reservar fechas ya tomadas (por otra reserva) | No permite elegirlas o informa que no están disponibles | | |
| UAT-09 | C | Pagar por transferencia | *Pagar* → ver datos → *Ya transferí* | Se informa el pago; el estado cambia a "pago informado" | | |
| UAT-10 | I | Correos | Revisar el correo tras reservar y tras la confirmación | Llegan mensajes claros, en español y sin errores | | |
| UAT-11 | I | Cancelar | Cancelar una reserva | Las fechas quedan libres; si había pago, figura como reembolsado | | |
| UAT-12 | I | Reseñar | Con una reserva finalizada, enviar reseña | La reseña se envía; se publica cuando ambos reseñaron | | |

#### Anfitrión
| ID | P | Caso | Pasos | Resultado esperado | Resultado | Hallazgo |
|---|---|---|---|---|---|---|
| UAT-13 | C | Completar perfil y datos bancarios | *Mi cuenta → Perfil* | Se guardan; el huésped los ve al pagar | | |
| UAT-14 | C | Publicar una oferta | *Publicar oferta* con foto y ubicación en el mapa | Aparece en *Mis ofertas* y en la búsqueda | | |
| UAT-15 | I | Editar y dar de baja | Editar el precio; dar de baja otra oferta | Cambios visibles; la dada de baja deja de aparecer | | |
| UAT-16 | C | Confirmar un pago | *Reservas recibidas → Confirmar pago* | La reserva pasa a *Confirmada*; el huésped recibe correo | | |
| UAT-17 | C | Rechazar con motivo | *Rechazar* sin motivo, luego con motivo | Exige motivo; el huésped lo recibe; fechas libres | | |
| UAT-18 | I | Finalizar | *Finalizar* una reserva confirmada | Habilita las reseñas | | |
| UAT-19 | I | Reportes | *Reportes* → filtro de fechas → descargar CSV | Totales coherentes con sus reservas; el CSV abre en Excel | | |
| UAT-20 | D | Comisión y neto | Mirar una reserva pagada | Muestra 10 % de comisión y el neto | | |

#### Transversales
| ID | P | Caso | Pasos | Resultado esperado | Resultado | Hallazgo |
|---|---|---|---|---|---|---|
| UAT-21 | C | Uso en celular | Repetir UAT-01, 04 y 07 en el celular | Todo se ve y se puede usar sin acercar ni desplazar de lado | | |
| UAT-22 | I | Mapa | Mover y acercar el mapa en Explorar | La lista se actualiza; los precios en los pines son legibles | | |
| UAT-23 | I | Velocidad percibida | Navegar 10 minutos | Sin esperas largas ni errores | | |
| UAT-24 | I | Comprensión del lenguaje | La clienta lee textos y botones | Se entiende sin explicación; anotar términos confusos | | |
| UAT-25 | D | Accesibilidad básica | Usar solo teclado en la portada y la reserva | Se puede completar; el foco es visible | | |
| UAT-26 | C | Sin datos de prueba visibles | Revisar el sitio de producción final | No hay usuarios ni ofertas demo ni textos de ejemplo | | |

### Guion de la sesión (≈ 90 min)
1. (5 min) Objetivo, reglas y consentimiento para anotar observaciones.
2. (15 min) Recorrido libre: *"Imagine que quiere encontrar una experiencia para su familia"* — el equipo observa en silencio.
3. (45 min) Casos UAT-01 a UAT-26 en el orden de las tablas; se registra resultado y hallazgo.
4. (15 min) Preguntas abiertas: ¿qué le falta? ¿qué le sobra? ¿qué le dio desconfianza?
5. (10 min) Resumen de hallazgos por severidad y acuerdo de siguientes pasos.

---
## F-64b · Ejecución y cierre

### Registro de hallazgos
| N.º | Caso | Descripción | Severidad | Responsable | Corrección acordada | Fecha compromiso | Estado |
|---|---|---|---|---|---|---|---|
| H-01 | | | | | | | |
| H-02 | | | | | | | |

### Decisiones de la clienta (sugerencias para versiones futuras)
| Sugerencia | Prioridad | ¿Se incluye en? |
|---|---|---|
| | | |

### Acta de aceptación

**Proyecto:** W Experiencias — plataforma de reservas de turismo regenerativo y de bienestar (Región del Maule)
**Versión probada:** ________ (etiqueta de Git: `v____`) **Fecha:** __ / __ / ____ **Ambiente:** ________________

**Resumen de resultados:** casos críticos aprobados ___ / ___ · importantes ___ / ___ · deseables ___ / ___ ·
hallazgos: bloqueantes ___ · mayores ___ · menores ___

**Dictamen** (marque uno):
- [ ] **Aceptado.** El sistema cumple lo requerido para su puesta en producción.
- [ ] **Aceptado con observaciones.** Se acepta con las correcciones de la lista de hallazgos mayores/menores, a verificar antes de __ / __ / ____.
- [ ] **No aceptado.** Hay hallazgos bloqueantes; se repetirá la UAT el __ / __ / ____.

**Observaciones de la clienta:** ____________________________________________________________________________

| | Nombre | Cargo | Firma | Fecha |
|---|---|---|---|---|
| Clienta | | | | |
| Responsable del proyecto | | | | |
| Profesor/a guía (si corresponde) | | | | |

> Guarde el acta firmada y el registro de hallazgos como anexo del informe.

# Diseño Estratégico (DDD) - QuickTicket

Este documento detalla el análisis estratégico de diseño guiado por el dominio (DDD) para la extracción del **Motor de Reservas y Pagos** del monolito de QuickTicket, con el objetivo de escalar de forma independiente y soportar escenarios de alta demanda.

---

## 1. Event Storming

El siguiente flujo representa los eventos de dominio clave (hechos que ya ocurrieron en el negocio) para el camino principal y los escenarios alternativos de fallas o expiraciones:

![Event Storming](./imgs/Event%20Storming.png)

### Secuencia de Eventos Clave:
1. **Asiento Seleccionado:** El usuario elige un lugar específico en el mapa del evento.
2. **Asiento Bloqueado:** El sistema reserva el asiento de forma exclusiva por un tiempo limitado.
3. **Bloqueo de Asiento Expirado:** Escenario alternativo donde el usuario no completa el proceso a tiempo y el inventario se libera.
4. **Orden de Pago Generada:** Se prepara el registro transaccional para iniciar el cobro.
5. **Pago Procesado:** La pasarela externa confirma el éxito de la transacción.
6. **Asiento Vendido:** El estado del asiento cambia de forma definitiva al confirmarse el pago exitoso. 
7. **Pago Fallido:** Escenario alternativo donde la pasarela externa falla o arroja un timeout.
8. **Boleto Emitido:** Se genera el recurso digital que confirma el derecho de acceso.
9. **Correo de Confirmación Enviado:** Se notifica al cliente con sus boletos finales.

---

## 2. Bounded Contexts (Contextos Acotados)

Para resolver el acoplamiento del monolito, el sistema se divide en tres fronteras lógicas con responsabilidades bien definidas:

![Bounded Contexts](./imgs/Bounded%20Contexts.png)

* **Gestión de Reservas:** Encargado del inventario de asientos en tiempo real, la selección y el control de los bloqueos temporales.
* **Gestión de Pagos:** Responsable de la creación de órdenes de cobro y de la integración con la pasarela externa (GlobalPay).
* **Gestión de Notificaciones:** Encargado de la generación de documentos PDF y del envío de comprobantes por correo electrónico.

---

## 3. Context Map (Mapa de Contextos)

Para evitar que la lentitud de la pasarela de pagos agote las conexiones de la base de datos de reservas, la comunicación entre estos contextos pasa de ser síncrona a **asíncrona dirigida por eventos** a través de un Message Broker.

* **Relación Reservas -> Pagos (Publisher / Subscriber):** El contexto de *Gestión de Reservas* publica el evento `Asiento Bloqueado`. El contexto de *Gestión de Pagos* está suscrito a este evento para reaccionar generando la orden de pago, sin bloquear el inventario de forma síncrona.
* **Relación Pagos -> Notificaciones (Publisher / Subscriber):** Una vez que *Gestión de Pagos* procesa el dinero de forma exitosa, publica `Pago Procesado`, permitiendo que *Gestión de Notificaciones* reaccione en segundo plano para emitir el boleto.

---

## 4. Glosario (Ubiquitous Language)

1.  **QuickTicket:** Plataforma de venta de entradas para eventos masivos.
2.  **Asiento:** Unidad mínima de inventario disponible para un evento. Puede encontrarse en estado *disponible*, *bloqueado* o *vendido*.
3.  **Boleto:** Comprobante digital definitivo que confirma el éxito de la compra y permite el acceso físico al evento.
4.  **Orden de Compra:** Registro transaccional que contiene la información del cobro, montos y estado de la comunicación con la pasarela.
5.  **Bloqueo Temporal:** Estado de reserva exclusiva de un asiento que realiza un usuario durante un tiempo limitado mientras completa su pago.
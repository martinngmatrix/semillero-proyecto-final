## 1. Indicadores y Objetivos de Nivel de Servicio (SLIs / SLOs)

El Servicio de Reservas de QuickTicket debe mantener estabilidad y capacidad de respuesta incluso durante eventos de alta demanda, evitando que fallas externas afecten la experiencia de compra.

### Latencia de Bloqueo de Asientos

* **Definición del SLI:**  
Porcentaje de solicitudes válidas de bloqueo de asiento (`POST /reservations`) que completan el proceso de reserva temporal y publican exitosamente el evento `SeatReserved` en menos de **500 ms**.

* **Objetivo (SLO):**  
**99%** de las solicitudes válidas deben completarse en menos de **500 ms**, medidos en una ventana móvil de 30 días.

* **Justificación de Negocio:**  
Durante preventas masivas, los usuarios compiten simultáneamente por un número limitado de asientos. Una latencia elevada incrementa el riesgo de sobreventa, abandonos de compra y percepción de inestabilidad de la plataforma. El objetivo es garantizar una experiencia fluida incluso bajo picos extremos de concurrencia.

---

### Disponibilidad del Flujo de Reservas

* **Definición del SLI:**  
Porcentaje de operaciones de reserva que finalizan correctamente sin errores internos del sistema (`5xx`) ni fallas de publicación de eventos hacia Kafka.

* **Objetivo (SLO):**  
El Servicio de Reservas debe mantener una disponibilidad mensual de **99.95%**.

* **Justificación de Negocio:**  
El flujo de reservas representa el núcleo transaccional de QuickTicket. Una indisponibilidad, incluso parcial, impide generar ingresos durante eventos de alta demanda y afecta directamente la reputación de la plataforma frente a usuarios y organizadores.

---

## 2. Patrón de Resiliencia en Arquitectura Asíncrona: Retry + Dead Letter Queue (DLQ)

### El Escenario de Fallo en un Entorno Dirigido por Eventos (EDA)

Dado que el **Servicio de Reservas** está desacoplado y únicamente publica el evento `SeatReserved` en Apache Kafka, una caída o degradación de la pasarela de pagos externa no afecta directamente el flujo principal de reservas.

El problema se traslada al microservicio de **Pagos**, el cual consume eventos desde Kafka e intenta procesar el cobro de forma transaccional. Si la pasarela externa presenta timeouts o errores temporales, el consumidor no debe bloquear indefinidamente el procesamiento de mensajes, ya que esto afectaría la capacidad de procesar pagos de otros usuarios.

### Aplicación del Patrón de Resiliencia: Retry + Dead Letter Queue (DLQ)

Para manejar fallos transitorios y permanentes sin perder eventos ni degradar el rendimiento del sistema, se implementa una estrategia combinada de **Retry con Backoff Exponencial**, **Retry Topics** y **Dead Letter Queue (DLQ)**.

#### 1. Reintento Inmediato (Short Retry)

Cuando el microservicio de Pagos detecta errores temporales de infraestructura (por ejemplo, HTTP `503`, timeout o errores de red), ejecuta una política de reintentos locales utilizando **Exponential Backoff**.

Ejemplo de secuencia:
* Primer intento: inmediato
* Segundo intento: 1 segundo
* Tercer intento: 2 segundos
* Cuarto intento: 4 segundos

El objetivo es absorber fallos momentáneos sin impactar innecesariamente la experiencia del usuario ni saturar la pasarela externa.

#### 2. Retry Topic Asíncrono

Si los reintentos inmediatos fallan, el mensaje no se pierde ni bloquea el consumidor principal. El servicio confirma el offset del tópico principal (`seat-reservations`) y redirige el evento hacia un tópico secundario llamado `payments-retry`.

Un worker especializado procesa posteriormente este tópico utilizando intervalos de reintento más amplios (por ejemplo, cada 5 minutos), permitiendo que la pasarela externa se recupere mientras el flujo principal continúa operando normalmente.

#### 3. Dead Letter Queue (DLQ)

Si el evento supera el número máximo de reintentos configurados o se detecta un error no recuperable (por ejemplo, fraude o tarjeta rechazada), el mensaje es enviado al tópico `payments-dlq`.

##### Comportamiento y Compensación

* El evento permanece almacenado para auditoría y análisis operativo.
* El sistema emite un evento `PaymentFailed`.
* El Servicio de Reservas consume este evento y ejecuta la liberación del asiento previamente bloqueado.
* El asiento vuelve automáticamente al inventario disponible.

### Ventajas Arquitectónicas para QuickTicket

* **Aislamiento de Fallos:**  
Una caída en la pasarela de pagos no afecta la navegación ni el flujo de reservas.

* **Escalabilidad Independiente:**  
El procesamiento de pagos puede escalar de forma aislada según la carga transaccional.

* **Tolerancia a Fallos:**  
Los eventos no se pierden gracias al uso de Kafka, Retry Topics y DLQ.

* **Trazabilidad Completa:**  
Cada intento fallido queda registrado y puede ser auditado posteriormente por soporte técnico u operaciones.
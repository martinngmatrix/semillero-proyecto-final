# QuickTicket: Diseño de Arquitectura
### Justificación Técnica
**Extracción del Motor de Reservas y Pagos del Monolito Central**

---

## 1. El Problema de Negocio: Arquitectura "As-Is"

### Limitaciones Técnicas del Monolito Tradicional

* **Cuello de Botella Transaccional:** Búsqueda de evento, bloqueo temporal de asientos y pago comparten una única base de datos relacional.
* **Degradación por Terceros:** La integración síncrona con GlobalPay genera timeouts prolongados bajo alta demanda.
* **Efecto Cascada:** La lentitud en pagos bloquea conexiones y afecta incluso la navegación del catálogo de eventos.

---

## 2. Diseño Estratégico: Bounded Contexts

Definición de fronteras lógicas para desacoplar responsabilidades críticas del negocio:

![Event Storming](./docs/imgs/Bounded%20Contexts.png)

* **Gestión de Reservas:** Administración de asientos y bloqueos temporales.
* **Gestión de Pagos:** Generación de ordenes de pago y ejecución de pagos en GlobalPay.
* **Gestión de Notificaciones:** Envío de correos y boletos de confirmación.

---

## 3. Nueva Topología: C4 Contenedores (Nivel 2)

*Separación de responsabilidades entre reservas, pagos y procesamiento asíncrono.*

![C4 Contenedores](./docs/imgs/Diagrama%20C4%20de%20Contenedores%20(Nivel%202).png)

---

## 4. Justificación Técnica: ADR-0001 (Comunicación)

### Arquitectura Asíncrona Basada en Eventos mediante Kafka

* **Decisión:** El Servicio de Reservas publica eventos asíncronos para desacoplar el procesamiento de pagos.
* **Beneficio:** La lentitud de GlobalPay deja de impactar directamente el flujo principal de reservas.
* **Trade-off:** Incremento de complejidad operativa al incorporar mensajería distribuida y procesamiento asíncrono.

---

## 5. Justificación Técnica: ADR-0002 (Persistencia)

### Persistencia Híbrida: PostgreSQL + Redis

* **Decisión:** Uso de Redis para bloqueos temporales de asientos y PostgreSQL como fuente de verdad para reservas confirmadas y auditoría.
* **Mecanismo de Control:** Los bloqueos temporales utilizan TTL de 10 minutos para liberar automáticamente el inventario expirado.
* **Beneficio:** Se reduce la contención sobre la base de datos relacional durante picos masivos de concurrencia.
* **Trade-off:** Incremento de complejidad operativa al administrar dos mecanismos de persistencia.

---

## 6. Resiliencia y Tolerancia a Fallos

### Patrón Aplicado: Retry + Dead Letter Queue (DLQ)

* **Retry con Exponential Backoff:** Ante fallos temporales de comunicación con GlobalPay, el servicio de pagos ejecuta reintentos inmediatos con tiempos de espera crecientes para absorber errores transitorios sin saturar la pasarela externa.
* **Retry Topic Asíncrono:** Si los reintentos locales fallan, el evento se redirige a un tópico secundario (`payments-retry`) para ser reprocesado posteriormente sin bloquear el flujo principal.
* **Dead Letter Queue (DLQ):** Los eventos que superan el máximo de reintentos o presentan errores no recuperables se envían a un tópico de errores (`payments-dlq`) para auditoría y recuperación controlada.

---

## 7. Prueba de Concepto (PoC) Local

La PoC desarrollada demuestra el desacoplamiento entre reservas y pagos utilizando Kafka, Redis y PostgreSQL ejecutándose localmente mediante Docker Compose.

### Arquitectura Hexagonal

El Servicio de Reservas fue estructurado utilizando Arquitectura Hexagonal para desacoplar la lógica de negocio de los detalles de infraestructura.

```text
src/
 ├── domain/
 ├── application/
 ├── infrastructure/
```
facilitando mantenibilidad, pruebas y evolución futura del sistema.

### Flujo

1. El usuario solicita el bloqueo de un asiento.
2. El Servicio de Reservas crea un lock temporal en Redis con TTL de 10 minutos.
3. El servicio publica un evento en Kafka a traves del tópico seat-reservations.

### Componentes levantados localmente

* Kafka
* Redis
* Servicio de reservas

## 8. Beneficios de la Solución

* **Mayor Disponibilidad:** Las fallas o lentitud de la pasarela de pagos no afectan el flujo principal de reservas.
* **Escalabilidad Independiente:** El servicio de reservas puede escalar de forma aislada bajo alta demanda.
* **Procesamiento Asíncrono:** Kafka desacopla reservas y pagos, absorbiendo picos de carga sin bloquear el flujo principal.
* **Mejor Concurrencia:** Redis permite manejar bloqueos temporales de asientos con baja latencia.
* **Mantenibilidad:** Separación clara de responsabilidades mediante servicios desacoplados.

---

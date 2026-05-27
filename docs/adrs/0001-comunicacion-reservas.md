# ADR-0001: Estrategia de comunicación entre el Motor de Reservas y Pagos

## Estado
- **Estado:** Propuesto
- **Fecha:** 2026-05-24
- **Decisor:** Martín Ng

## Contexto y Problema
El monolito actual de QuickTicket colapsa durante eventos de alta demanda debido al acoplamiento síncrono entre la selección de asientos, la reserva y el pago en una única base de datos. La integración síncrona mediante HTTP/REST con la pasarela externa GlobalPay genera timeouts prolongados que agotan las conexiones disponibles, impidiendo incluso la navegación por el catálogo. Necesitamos aislar el motor de reservas para que opere y responda de forma independiente.

## Alternativas Consideradas
1. **Opción A: Comunicación Síncrona HTTP/REST directa.** El servicio de reservas llama directamente al servicio de pagos mediante una API REST y espera la respuesta. *Descartada porque mantiene el hilo de ejecución bloqueado y propaga la lentitud de GlobalPay a la base de datos de reservas.*
2. **Opción B: Arquitectura Dirigida por Eventos Asíncronos con Message Broker.** El servicio de reservas publica un evento y libera al cliente de inmediato. El servicio de pagos procesa el cobro reaccionando al evento en segundo plano. *Opción recomendada.*

## Decisión
**Opción B: Arquitectura Dirigida por Eventos Asíncronos con Message Broker**.

### Justificación Técnica
- **Modelo Reactivo:** El servicio de reservas solo se encarga de asegurar temporalmente el asiento y emitir el evento `Asiento Bloqueado`, respondiendo inmediatamente con la confirmación del bloqueo temporal del asiento.
- **Aislamiento de Fallos:** Si la pasarela de pagos externa experimenta lentitud, el impacto se absorbe en la cola de mensajes del broker. Esto evita el bloqueo de hilos HTTP en los servicios expuestos al cliente.

## Consecuencias y Trade-offs

* **Lo bueno (Pros):** Desacoplamiento temporal entre reservas y pagos, alta resiliencia del motor de reservas y protección de los hilos de conexión de la plataforma.
* **Lo malo (Contras):** Introduce la complejidad de administrar un Message Broker en la infraestructura y requiere gestionar estados de consistencia eventual en la interfaz de usuario.
* **Impacto en NFRs:** Mejora significativamente la **Disponibilidad** y la **Escalabilidad** del sistema al desacoplar el procesamiento de pagos del flujo síncrono de reservas, evitando que la lentitud de GlobalPay bloquee los servicios expuestos al cliente. Como trade-off, introduce mayor complejidad operativa debido al uso de mensajería asíncrona y procesamiento distribuido.
# Modelado C4 Model - QuickTicket

Este documento describe la arquitectura del sistema QuickTicket escalado, utilizando los Niveles 1 y 2 del estándar C4 Model para visualizar el desacoplamiento del Motor de Reservas y Pagos.

---

## 1. Diagrama de Contexto (Nivel 1)

El Diagrama de Contexto muestra las fronteras del sistema QuickTicket, los usuarios que lo consumen y las integraciones con servicios de terceros.

![Diagrama C4 de Contexto](./imgs/Diagrama%20C4%20de%20Contexto%20(Nivel%201).png)

### Componentes y Flujos:
* **Cliente (Web/Móvil):** Interactúa con QuickTicket para buscar eventos, reservar asientos y realizar pagos.
* **QuickTicket:** Ecosistema central que gestiona el negocio y el inventario de boletos.
* **GlobalPay API (Sistema Externo):** Invocado por QuickTicket para procesar los cobros de las entradas de manera síncrona.
* **MailSender API (Sistema Externo):** Invocado por QuickTicket para enviar las confirmaciones de compra y los boletos en formato PDF.

---

## 2. Diagrama de Contenedores (Nivel 2)

Para resolver el colapso por alta demanda, se descompone la caja central de QuickTicket aplicando el patrón de **Base de Datos por Servicio** y comunicación asíncrona.

![Diagrama C4 de Contenedores](./imgs/Diagrama%20C4%20de%20Contenedores%20(Nivel%202).png)

### Contenedores Principales:

1. **Web Frontend & Mobile App:** Aplicaciones cliente que consumen las APIs. La consulta del catálogo de eventos va directo al Monolito, aislando el tráfico de navegación del tráfico de transacciones.
2. **Monolito ("TicketCore"):** Mantiene las responsabilidades de *Usuarios* y *Catálogo de Eventos*. Persiste en una Base de Datos SQL (PostgreSQL) dedicada.
3. **Microservicio de Reservas:** Motor de alta concurrencia responsable de la disponibilidad y asignación de asientos. Utiliza Redis para bloqueos temporales con TTL automático y PostgreSQL como almacenamiento persistente de reservas confirmadas e historial operativo.
4. **Microservicio de Pagos:** Gestiona las transacciones financieras y la integración con GlobalPay. Utiliza una base de datos SQL independiente para garantizar propiedades ACID, trazabilidad financiera e idempotencia ante reintentos y callbacks duplicados.
5. **Message Broker (Kafka):** Intermediario asíncrono que permite la comunicación dirigida por eventos entre los servicios (ej. publicando `Asiento Bloqueado` y `Pago Procesado`), evitando el acoplamiento y la pérdida de conexiones.
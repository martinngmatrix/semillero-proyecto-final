# ADR-0002: Estrategia de persistencia de datos para el Motor de Reservas

## Estado
- **Estado:** Propuesto
- **Fecha:** 2026-05-24
- **Decisor:** Martín Ng

## Contexto y Problema
Durante picos de alta concurrencia por venta de entradas, miles de usuarios intentan reservar los mismos asientos en milisegundos. Una base de datos relacional tradicional puede sufrir degradación por contención de bloqueos y agotamiento de conexiones si se utiliza también para gestionar reservas temporales de corta duración.

El negocio requiere:
- bloquear asientos temporalmente durante el proceso de pago,
- liberar automáticamente los asientos luego de 10 minutos si el pago no se concreta,
- mantener consistencia transaccional sobre las reservas confirmadas,
- y soportar ráfagas masivas de concurrencia sin afectar el catálogo principal.

## Alternativas Consideradas

1. **Opción A: Base de Datos Relacional dedicada (SQL).**
Mantener PostgreSQL/MySQL como único mecanismo de persistencia para reservas temporales y definitivas.
*Descartada debido al incremento de contención transaccional, operaciones frecuentes de expiración y degradación bajo alta concurrencia.*

2. **Opción B: Base de Datos NoSQL de Documentos (MongoDB).**
Gestionar el estado de reservas mediante documentos con expiración.
*Descartada porque introduce complejidad adicional para garantizar consistencia transaccional estricta sobre reservas críticas y pagos confirmados.*

3. **Opción C: Persistencia híbrida PostgreSQL + Redis.**
Utilizar Redis para bloqueos temporales de asientos y PostgreSQL como fuente de verdad para reservas definitivas y auditoría.
*Opción recomendada.*

## Decisión

Nuestra elección es **Opción C: Persistencia híbrida PostgreSQL + Redis**.

### Justificación Técnica

- **Redis para Bloqueos Temporales:**  
  Redis permite manejar operaciones atómicas de alta concurrencia en memoria utilizando llaves con TTL (Time-To-Live). Cada asiento seleccionado se bloquea temporalmente durante 10 minutos evitando conflictos simultáneos entre usuarios.

- **Liberación Automática de Inventario:**  
  Si el pago falla o expira, Redis elimina automáticamente el lock temporal sin necesidad de procesos manuales de limpieza o polling sobre la base relacional.

- **PostgreSQL como Fuente de Verdad:**  
  Las reservas confirmadas, pagos y registros auditables se persisten en PostgreSQL garantizando consistencia transaccional, durabilidad y trazabilidad del negocio.

- **Separación de Responsabilidades:**  
  La arquitectura desacopla operaciones temporales de alta frecuencia de las transacciones permanentes del negocio, reduciendo presión sobre la base de datos relacional principal.

## Consecuencias y Trade-offs

* **Lo bueno (Pros):**
  - Alta capacidad de concurrencia para bloqueos temporales.
  - Liberación automática de asientos mediante TTL.
  - Reducción de contención sobre PostgreSQL.
  - Persistencia transaccional segura para reservas confirmadas.

* **Lo malo (Contras):**
  - Incremento de complejidad operativa al administrar dos tecnologías de persistencia.
  - Necesidad de sincronizar correctamente el estado temporal en Redis con el estado definitivo en PostgreSQL.
  - Riesgo de pérdida de locks temporales si Redis reinicia sin persistencia configurada (AOF/RDB).

* **Impacto en NFRs:**
  La estrategia mejora significativamente la **Concurrencia**, la **Performance** y la **Escalabilidad** del Motor de Reservas al desacoplar los bloqueos temporales del almacenamiento transaccional principal. Sin embargo, aumenta la complejidad operativa al incorporar dos tecnologías de persistencia (Redis y PostgreSQL).
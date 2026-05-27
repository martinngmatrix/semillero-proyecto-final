# 🎟️ QuickTicket - Microservicio de Reservas (PoC Local - Día 4)

Este proyecto representa la Prueba de Concepto (PoC) del núcleo transaccional del sistema de boletería **QuickTicket**. Implementa **Arquitectura Hexagonal** utilizando **TypeScript** y **Node.js**, desacoplando las reglas de negocio de los motores de infraestructura.

El sistema garantiza tolerancia a picos masivos de demanda mediante:
1. **Bloqueos transaccionales rápidos en memoria** utilizando Redis con expiración nativa (TTL).
2. **Propagación reactiva de eventos asíncronos** hacia un clúster de Apache Kafka en modo KRaft.

---

## 🛠️ Requisitos Previos
* Docker y Docker Compose instalados de forma local.
* Node.js v18 o superior instalado (para la ejecución del código).

---

## 🚀 Guía de Despliegue Rápido

1. **Levantar la Infraestructura:** Desde la raíz del directorio, inicializa los contenedores de Redis y Kafka en segundo plano:
   ```bash
   docker compose up -d
   ```

El servidor estará escuchando en el puerto 3000. Puedes verificar su estado apuntando al Health Check: http://localhost:3000/api/health.

---

## 📭 Prueba del Endpoint Principal (Crear Reserva)
Para simular una reserva masiva de alta concurrencia, realiza una petición HTTP POST al endpoint local:

* **URL:** http://localhost:3000/api/reservations
* **Método:** POST
* **Headers:** Content-Type: application/json

**Cuerpo de la Petición (Payload):**
```json
{
  "eventId": "evt_concert_2026",
  "userId": "usr_buyer_99",
  "seatLocation": "VIP-A12",
  "seatPrice": 150.00
}
```

---

## 🔍 Guía de Auditoría Técnica (Verificación de Estado)
Para demostrar el desacoplamiento y el correcto flujo de datos exigido por el CoE, sigue estos comandos para inspeccionar directamente los motores de infraestructura tras realizar un POST:

### 1. ¿Cómo revisar lo que se guardó en Redis?
Ingresaremos a la CLI del motor en memoria para validar la persistencia atómica y el tiempo de expiración (TTL).

Abre una terminal y accede de forma interactiva al contenedor de Redis:
```bash
docker exec -it qt-redis-reservas redis-cli
```

Lista todas las llaves almacenadas en la base de datos actual:
```bash
keys *
```
Deberías ver una llave con el prefijo estructurado de la aplicación: `reservation:res_xxxxxx`.

Consulta cuántos segundos le quedan de vida útil a ese bloqueo antes de borrarse solo:
```bash
ttl "tu_nombre_de_llave_detectado"
```
Retornará un número menor a 600 (los 10 minutos configurados por negocio). Al ejecutarlo de forma sucesiva verás cómo disminuye progresivamente, demostrando el control de concurrencia efímero.

Para salir de la consola de Redis ejecuta: `exit`.

### 2. ¿Cómo revisar que el evento se envió correctamente a Kafka?
Utilizaremos el script del consumidor por consola oficial de Apache para escuchar el tópico en tiempo real de manera aislada.

Abre otra terminal de tu sistema y ejecuta el consumidor apuntando al puerto de comunicación interno de Docker (29092):
```bash
docker exec -it qt-kafka-broker /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:29092 --topic seat-reservations --from-beginning
```

La consola entrará en modo escucha e imprimirá de inmediato el string JSON del evento enviado por el adaptador de TypeScript:
```json
{"eventType":"AsientoBloqueado","timestamp":"2026-05-25T21:34:00.290Z","payload":{"reservationId":"res_1779744840288_f86ve","eventId":"evt_concert_2026","userId":"usr_buyer_99","seatLocation":"VIP-A12","seatPrice":150,"expiresAt":"2026-05-25T21:44:00.288Z"}}
```

Para interrumpir la escucha del monitor de Kafka, presiona `Ctrl + C`.

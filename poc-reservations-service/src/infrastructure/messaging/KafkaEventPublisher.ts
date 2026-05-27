import { Kafka, Producer } from 'kafkajs';
import { IEventPublisher } from '../../domain/repositories/IEventPublisher';

export class KafkaEventPublisher implements IEventPublisher {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'quickticket-reservas',
      brokers: [process.env.KAFKA_BROKERS || '127.0.0.1:9092']
    });
    this.producer = kafka.producer();
    this.producer.connect().catch(console.error);
  }

  public async publish(topic: string, event: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.payload.reservationId,
          value: JSON.stringify(event)
        }
      ]
    });
  }
}
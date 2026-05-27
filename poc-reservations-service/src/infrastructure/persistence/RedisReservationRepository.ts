import { createClient } from 'redis';
import { IReservationRepository } from '../../domain/repositories/IReservationRepository';
import { Reservation } from '../../domain/models/Reservation';

export class RedisReservationRepository implements IReservationRepository {
  private client;

  constructor() {
    this.client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    this.client.connect().catch(console.error);
  }

  public async save(reservation: Reservation): Promise<void> {
    const key = `reservation:${reservation.id}`;
    const value = JSON.stringify(reservation);
    
    const ttlInSeconds = Math.max(
      Math.ceil((reservation.expiresAt.getTime() - Date.now()) / 1000), 
      0
    );

    await this.client.set(key, value, {
      EX: ttlInSeconds
    });
  }

  public async findById(id: string): Promise<Reservation | null> {
    const data = await this.client.get(`reservation:${id}`);
    if (!data) return null;
    
    const props = JSON.parse(data);
    return new Reservation({
      ...props,
      createdAt: new Date(props.createdAt),
      expiresAt: new Date(props.expiresAt)
    });
  }
}
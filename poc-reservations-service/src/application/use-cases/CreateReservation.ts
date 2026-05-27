import { Reservation } from '../../domain/models/Reservation';
import { IReservationRepository } from '../../domain/repositories/IReservationRepository';
import { IEventPublisher } from '../../domain/repositories/IEventPublisher';

interface CreateReservationInput {
  eventId: string;
  userId: string;
  seatLocation: string;
  seatPrice: number;
}

export class CreateReservation {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  public async execute(input: CreateReservationInput): Promise<Reservation> {
    const reservation = new Reservation({
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: input.eventId,
      userId: input.userId,
      seatLocation: input.seatLocation,
      seatPrice: input.seatPrice
    });

    await this.reservationRepository.save(reservation);

    await this.eventPublisher.publish('seat-reservations', {
      eventType: 'AsientoBloqueado',
      timestamp: new Date().toISOString(),
      payload: {
        reservationId: reservation.id,
        eventId: reservation.eventId,
        userId: reservation.userId,
        seatLocation: reservation.seatLocation,
        seatPrice: reservation.seatPrice,
        expiresAt: reservation.expiresAt.toISOString()
      }
    });

    return reservation;
  }
}
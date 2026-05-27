import { SeatStatus } from '../value-objects/SeatStatus';

export interface ReservationProps {
  id: string;
  eventId: string;
  userId: string;
  seatLocation: string;
  seatPrice: number;
  status?: SeatStatus;
  createdAt?: Date;
  expiresAt?: Date;
}

export class Reservation {
  public readonly id: string;
  public readonly eventId: string;
  public readonly userId: string;
  public readonly seatLocation: string;
  public readonly seatPrice: number;
  public status: SeatStatus;
  public readonly createdAt: Date;
  public readonly expiresAt: Date;

  constructor(props: ReservationProps) {
    this.id = props.id;
    this.eventId = props.eventId;
    this.userId = props.userId;
    this.seatLocation = props.seatLocation;
    this.seatPrice = props.seatPrice;
    this.status = props.status ?? SeatStatus.PENDING;
    this.createdAt = props.createdAt ?? new Date();
    this.expiresAt = props.expiresAt ?? new Date(this.createdAt.getTime() + 10 * 60 * 1000);
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
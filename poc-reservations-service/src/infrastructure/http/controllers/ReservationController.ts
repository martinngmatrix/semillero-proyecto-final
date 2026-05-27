import { Request, Response } from 'express';
import { CreateReservation } from '../../../application/use-cases/CreateReservation';

export class ReservationController {
  constructor(private readonly createReservationUseCase: CreateReservation) {}

  public handle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId, userId, seatLocation, seatPrice } = req.body;

      const reservation = await this.createReservationUseCase.execute({
        eventId,
        userId,
        seatLocation,
        seatPrice
      });

      res.status(201).json({
        success: true,
        message: 'Asiento bloqueado temporalmente por 10 minutos.',
        data: reservation
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
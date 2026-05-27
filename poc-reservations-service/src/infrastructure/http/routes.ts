import { Router } from 'express';
import { ReservationController } from './controllers/ReservationController';
import { CreateReservation } from '../../application/use-cases/CreateReservation';
import { RedisReservationRepository } from '../persistence/RedisReservationRepository';
import { KafkaEventPublisher } from '../messaging/KafkaEventPublisher';

const router = Router();

const redisRepository = new RedisReservationRepository();
const kafkaPublisher = new KafkaEventPublisher();
const createReservationUseCase = new CreateReservation(redisRepository, kafkaPublisher);
const reservationController = new ReservationController(createReservationUseCase);

router.post('/reservations', reservationController.handle);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'quickticket-reservations' });
});

export { router };
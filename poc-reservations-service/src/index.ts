import express from 'express';
import { router } from './infrastructure/http/routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', router);

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 QuickTicket Reservations PoC Server is running!`);
  console.log(`🔊 Port: ${PORT}`);
  console.log(`🎟️  Endpoint local: http://localhost:${PORT}/api/reservations`);
  console.log(`====================================================`);
});
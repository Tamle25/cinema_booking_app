import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { SeatGateway } from './gateways/seat.gateway';

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const seatGateway = new SeatGateway(io);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WebSocket service is running' });
});

app.post('/internal/booking-completed', (req, res) => {
  const { showtimeId, seats } = req.body;

  if (!showtimeId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const lockService = seatGateway.getLockService();
  
  lockService.markSeatsAsBooked(showtimeId, seats);

  io.to(`showtime_${showtimeId}`).emit('seat_booked', {
    showtimeId,
    seats,
  });

  return res.json({ success: true, message: 'Updated successfully' });
});

app.post('/internal/booking-released', (req, res) => {
  const { showtimeId, seats } = req.body;

  if (!showtimeId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const lockService = seatGateway.getLockService();

  seats.forEach((seat) => {
    lockService.unlockSeat(showtimeId, seat);
    
    io.to(`showtime_${showtimeId}`).emit('seat_unlocked', {
      showtimeId,
      seatName: seat,
    });
  });

  return res.json({ success: true, message: 'Seats released successfully' });
});

httpServer.listen(config.port);

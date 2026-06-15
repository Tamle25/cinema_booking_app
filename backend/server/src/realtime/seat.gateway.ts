import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeatLockService } from './seat-lock.service';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { Booking } from '../bookings/schemas/booking.schema';
import { JoinShowtimePayload } from './types';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 15000,
  pingTimeout: 30000,
})
export class SeatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly seatLockService: SeatLockService,
    private readonly showtimesService: ShowtimesService,
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
  ) {}

  handleConnection(client: Socket) {
    const ts = () => new Date().toISOString();
    console.log(
      `[SeatGateway ${ts()}] [CONNECTION] Client connected: socketId=${client.id}`,
    );
  }

  handleDisconnect(client: Socket) {
    const ts = () => new Date().toISOString();
    console.log(
      `[SeatGateway ${ts()}] [DISCONNECT] Client disconnected: socketId=${client.id}`,
    );
  }

  @SubscribeMessage('join_showtime')
  async handleJoinShowtime(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinShowtimePayload,
  ) {
    const { showtimeId } = payload;
    const ts = () => new Date().toISOString();
    console.log(
      `[SeatGateway ${ts()}] [JOIN_SHOWTIME] Client socketId=${client.id} joins showtimeId=${showtimeId}`,
    );
    if (!showtimeId) return;

    client.join(`showtime_${showtimeId}`);

    // Khởi tạo cache ghế đã đặt từ database nếu chưa được gieo mầm
    if (!this.seatLockService.isCacheSeeded(showtimeId)) {
      try {
        const showtime = await this.showtimesService.findOne(showtimeId);
        if (showtime) {
          // Lấy tất cả các booking đang ở trạng thái pending (đang thanh toán) của suất chiếu này
          const pendingBookings = await this.bookingModel.find({
            showtime: showtimeId,
            status: 'pending',
          });

          const pendingSeats = pendingBookings.reduce<string[]>((acc, b) => {
            return acc.concat(b.seats || []);
          }, []);

          // Ghế confirmed = tất cả booked_seats trong DB trừ đi các ghế đang pending
          const dbBookedSeats = Array.isArray(showtime.booked_seats)
            ? showtime.booked_seats
            : [];
          const confirmedSeats = dbBookedSeats.filter(
            (seat) => !pendingSeats.includes(seat),
          );

          this.seatLockService.seedSeats(
            showtimeId,
            confirmedSeats,
            pendingSeats,
          );
          console.log(
            `[SeatGateway ${ts()}] seed ok — showtime=${showtimeId} confirmedCount=${confirmedSeats.length} pendingCount=${pendingSeats.length}`,
          );
        }
      } catch (err) {
        console.error(
          `[SeatGateway ${ts()}] Error seeding showtimeId=${showtimeId}:`,
          err,
        );
      }
    }

    const state = this.seatLockService.getShowtimeState(showtimeId);
    client.emit('seat_state_sync', {
      showtimeId,
      lockedSeats: state.lockedSeats, // Ghế đang giữ (pending) -> màu cam
      bookedSeats: state.bookedSeats, // Ghế đã bán (confirmed) -> màu đỏ/xám
    });
  }

  @SubscribeMessage('leave_showtime')
  handleLeaveShowtime(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { showtimeId: string },
  ) {
    const { showtimeId } = payload;
    if (!showtimeId) return;
    client.leave(`showtime_${showtimeId}`);
    const ts = () => new Date().toISOString();
    console.log(
      `[SeatGateway ${ts()}] [LEAVE_SHOWTIME] Client socketId=${client.id} left showtimeId=${showtimeId}`,
    );
  }
}

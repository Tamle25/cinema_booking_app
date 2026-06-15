import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showtime } from '../showtimes/schemas/showtime.schema';
import { SeatLockService } from '../realtime/seat-lock.service';
import { SeatGateway } from '../realtime/seat.gateway';

/**
 * Quản lý trạng thái ghế (giữ/giải phóng) và đồng bộ với Socket.IO Gateway.
 */
@Injectable()
export class SeatReservationService {
  private readonly logger = new Logger(SeatReservationService.name);

  constructor(
    @InjectModel(Showtime.name) private readonly showtimeModel: Model<Showtime>,
    private readonly seatLockService: SeatLockService,
    private readonly seatGateway: SeatGateway,
  ) {}

  /**
   * Giữ ghế một cách nguyên tử: chỉ thành công nếu KHÔNG ghế nào trong danh
   * sách đã bị đặt trước đó. Trả về showtime sau khi cập nhật.
   */
  async lockSeats(showtimeId: string, seats: string[]): Promise<Showtime> {
    const ts = () => new Date().toISOString();
    this.logger.log(`[SeatReservationService ${ts()}] [LOCK_SEATS_START] Attempting atomic lock for showtimeId=${showtimeId}, seats=${seats.join(',')}`);
    const showtime = await this.showtimeModel.findOneAndUpdate(
      { _id: showtimeId, booked_seats: { $nin: seats } },
      { $addToSet: { booked_seats: { $each: seats } } },
      { new: true },
    );

    if (showtime) {
      this.logger.log(`[SeatReservationService ${ts()}] [LOCK_SEATS_SUCCESS] Atomic lock succeeded for showtimeId=${showtimeId}, seats=${seats.join(',')}`);
      return showtime;
    }

    const exists = await this.showtimeModel.exists({ _id: showtimeId });
    if (!exists) {
      this.logger.warn(`[SeatReservationService ${ts()}] [LOCK_SEATS_FAILED_NOT_FOUND] Showtime not found: showtimeId=${showtimeId}`);
      throw new Error('SHOWTIME_NOT_FOUND');
    }
    this.logger.warn(`[SeatReservationService ${ts()}] [LOCK_SEATS_FAILED_TAKEN] Seats already taken for showtimeId=${showtimeId}, seats=${seats.join(',')}`);
    throw new Error('SEATS_ALREADY_TAKEN');
  }

  /**
   * Khóa ghế tạm thời ở trạng thái pending (khi bắt đầu thực hiện thanh toán).
   */
  async lockSeatsPending(showtimeId: string, seats: string[]): Promise<void> {
    const ts = () => new Date().toISOString();
    this.logger.log(`[SeatReservationService ${ts()}] [LOCK_SEATS_PENDING] Notifying SeatLockService and SeatGateway for showtimeId=${showtimeId}, seats=${seats.join(',')}`);

    this.seatLockService.lockSeatsPending(showtimeId, seats);

    if (this.seatGateway.server) {
      this.seatGateway.server.to(`showtime_${showtimeId}`).emit('seat_locked', {
        showtimeId,
        seats,
      });
      this.logger.log(`[SeatReservationService ${ts()}] [LOCK_SEATS_PENDING_EMIT_SUCCESS] Emitted seat_locked via Socket.IO`);
    } else {
      this.logger.warn(`[SeatReservationService ${ts()}] [LOCK_SEATS_PENDING_EMIT_SKIP] Socket.IO server is not initialized yet`);
    }
  }

  /**
   * Thông báo cho Socket.IO Gateway rằng ghế đã được đặt thành công (confirmed).
   */
  async markSeatsBooked(showtimeId: string, seats: string[]): Promise<void> {
    const ts = () => new Date().toISOString();
    this.logger.log(`[SeatReservationService ${ts()}] [MARK_SEATS_BOOKED_NOTIFY] Notifying SeatLockService and SeatGateway for showtimeId=${showtimeId}, seats=${seats.join(',')}`);

    this.seatLockService.markSeatsAsBooked(showtimeId, seats);
    
    if (this.seatGateway.server) {
      this.seatGateway.server.to(`showtime_${showtimeId}`).emit('seat_booked', {
        showtimeId,
        seats,
      });
      this.logger.log(`[SeatReservationService ${ts()}] [MARK_SEATS_BOOKED_EMIT_SUCCESS] Emitted seat_booked via Socket.IO for showtimeId=${showtimeId}`);
    } else {
      this.logger.warn(`[SeatReservationService ${ts()}] [MARK_SEATS_BOOKED_EMIT_SKIP] Socket.IO server is not initialized yet`);
    }
  }

  /**
   * Giải phóng ghế của một booking và thông báo Socket.IO.
   */
  async releaseSeats(booking: {
    showtime: any;
    seats: string[];
  }): Promise<void> {
    const ts = () => new Date().toISOString();
    const showtimeId = this.extractShowtimeId(booking.showtime);
    this.logger.log(`[SeatReservationService ${ts()}] [RELEASE_SEATS_START] Releasing seats in DB for showtimeId=${showtimeId}, seats=${booking.seats.join(',')}`);

    await this.showtimeModel.findByIdAndUpdate(showtimeId, {
      $pull: { booked_seats: { $in: booking.seats } },
    });

    this.logger.log(`[SeatReservationService ${ts()}] [RELEASE_SEATS_NOTIFY] Notifying SeatLockService and SeatGateway for showtimeId=${showtimeId}, seats=${booking.seats.join(',')}`);

    this.seatLockService.releaseSeats(showtimeId, booking.seats);
    
    if (this.seatGateway.server) {
      this.seatGateway.server.to(`showtime_${showtimeId}`).emit('seat_released', {
        showtimeId,
        seats: booking.seats,
      });
      this.logger.log(`[SeatReservationService ${ts()}] [RELEASE_SEATS_EMIT_SUCCESS] Emitted seat_released via Socket.IO for showtimeId=${showtimeId}`);
    } else {
      this.logger.warn(`[SeatReservationService ${ts()}] [RELEASE_SEATS_EMIT_SKIP] Socket.IO server is not initialized yet`);
    }
  }

  private extractShowtimeId(showtime: any): string {
    if (!showtime) return '';
    if (typeof showtime === 'string') return showtime;
    if (showtime._id) return showtime._id.toString();
    return showtime.toString();
  }
}

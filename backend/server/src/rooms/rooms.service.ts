import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) { }

  async create(createDto: CreateRoomDto): Promise<Room> {
    const { cinema_id, rows, columns, ...rest } = createDto;

    const newRoom = new this.roomModel({
      ...rest,
      cinema: cinema_id,
      rows,
      columns,
      total_seats: rows * columns,
    });
    return newRoom.save();
  }

  async update(id: string, updateDto: UpdateRoomDto): Promise<Room> {
    const room = await this.roomModel.findById(id);
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng chiếu!');
    }

    // Xử lý mapping fields
    const updateData: any = { ...updateDto };
    if (updateDto.cinema_id) {
      updateData.cinema = updateDto.cinema_id;
      delete updateData.cinema_id;
    }

    // Tính lại total_seats nếu đổi rows hoặc columns
    const newRows = updateDto.rows ?? room.rows;
    const newColumns = updateDto.columns ?? room.columns;
    if (updateDto.rows || updateDto.columns) {
      updateData.total_seats = newRows * newColumns;
    }

    const updated = await this.roomModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('cinema')
      .exec();

    if (!updated) {
      throw new NotFoundException('Không thể cập nhật phòng chiếu!');
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const room = await this.roomModel.findById(id);
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng chiếu!');
    }

    // Soft delete
    await this.roomModel.findByIdAndUpdate(id, { is_active: false });
    return { message: 'Đã xóa phòng chiếu thành công!' };
  }

  async findByCinema(cinemaId: string): Promise<Room[]> {
    return this.roomModel.find({ cinema: cinemaId }).exec();
  }

  // Chỉ lấy phòng đang hoạt động (dùng cho tạo suất chiếu)
  async findByCinemaActive(cinemaId: string): Promise<Room[]> {
    return this.roomModel.find({ cinema: cinemaId, is_active: true }).exec();
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomModel.findById(id).populate('cinema').exec();

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng chiếu này!');
    }

    return room;
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find().populate('cinema').exec();
  }
}
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

    const updateData: any = { ...updateDto };
    if (updateDto.cinema_id) {
      updateData.cinema = updateDto.cinema_id;
      delete updateData.cinema_id;
    }

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

    await this.roomModel.findByIdAndUpdate(id, { is_active: false });
    return { message: 'Đã xóa phòng chiếu thành công!' };
  }

  async findByCinema(cinemaId: string): Promise<Room[]> {
    return this.roomModel.find({ cinema: cinemaId }).exec();
  }

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

  async findAllPaginated(query?: {
    page?: number;
    limit?: number;
    cinema_id?: string;
  }): Promise<any> {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = { is_active: true };

    if (query?.cinema_id) {
      filter.cinema = query.cinema_id;
    }

    const [data, totalItems] = await Promise.all([
      this.roomModel
        .find(filter)
        .populate('cinema')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.roomModel.countDocuments(filter),
    ]);
    
    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: "Lấy danh sách phòng chiếu thành công",
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {}

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

  async findByCinema(cinemaId: string): Promise<Room[]> {
    return this.roomModel.find({ cinema: cinemaId }).exec();
  }

  // --- ĐOẠN ĐÃ SỬA LỖI ---
  async findOne(id: string): Promise<Room> {
     const room = await this.roomModel.findById(id).populate('cinema').exec();
     
     // Kiểm tra nếu không tìm thấy thì báo lỗi ngay
     if (!room) {
       throw new NotFoundException('Không tìm thấy phòng chiếu này!');
     }

     return room;
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find().populate('cinema').exec();
  }
}
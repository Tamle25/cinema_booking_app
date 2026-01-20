import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cinema } from './schemas/cinema.schema';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';

@Injectable()
export class CinemasService {
  constructor(@InjectModel(Cinema.name) private cinemaModel: Model<Cinema>) {}

  async create(createDto: CreateCinemaDto): Promise<Cinema> {
    const { cinema_system_id, ...rest } = createDto;
    
    const newCinema = new this.cinemaModel({
      ...rest,
      cinema_system: cinema_system_id, // Gán ID hãng vào relationship
    });
    return newCinema.save();
  }

  async findAll(): Promise<Cinema[]> {
    // .populate('cinema_system') giúp lấy luôn Logo, Tên hãng rạp kèm theo
    return this.cinemaModel.find().populate('cinema_system').exec();
  }
  
  // Lấy rạp theo ID hệ thống (VD: Lấy tất cả rạp Beta)
  async findBySystem(systemId: string): Promise<Cinema[]> {
    return this.cinemaModel.find({ cinema_system: systemId }).populate('cinema_system').exec();
  }

  // Lấy danh sách các thành phố có rạp chiếu
  async getCities(): Promise<string[]> {
    const cities = await this.cinemaModel.distinct('city').exec();
    return cities.filter(city => city); // Loại bỏ null/undefined
  }

  // Lọc rạp theo hệ thống và/hoặc khu vực
  async filterCinemas(systemId?: string, city?: string): Promise<Cinema[]> {
    const filter: any = {};
    
    if (systemId) {
      filter.cinema_system = systemId;
    }
    if (city) {
      filter.city = city;
    }
    
    return this.cinemaModel.find(filter).populate('cinema_system').exec();
  }

  // Lấy chi tiết 1 rạp theo ID
  async findOne(id: string): Promise<Cinema> {
    const cinema = await this.cinemaModel.findById(id).populate('cinema_system').exec();
    if (!cinema) {
      throw new NotFoundException(`Không tìm thấy rạp với ID: ${id}`);
    }
    return cinema;
  }

  // Cập nhật thông tin rạp
  async update(id: string, updateDto: UpdateCinemaDto): Promise<Cinema> {
    const { cinema_system_id, ...rest } = updateDto;
    
    const updateData: any = { ...rest };
    if (cinema_system_id) {
      updateData.cinema_system = cinema_system_id;
    }
    
    const updated = await this.cinemaModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('cinema_system')
      .exec();
    
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy rạp với ID: ${id}`);
    }
    return updated;
  }

  // Xóa rạp
  async delete(id: string): Promise<{ message: string }> {
    const result = await this.cinemaModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Không tìm thấy rạp với ID: ${id}`);
    }
    return { message: 'Xóa rạp thành công' };
  }
}
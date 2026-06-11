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
      cinema_system: cinema_system_id,
    });
    return newCinema.save();
  }

  async findAll(): Promise<Cinema[]> {
    return this.cinemaModel.find().populate('cinema_system').exec();
  }

  async findAllPaginated(page: number, limit: number): Promise<any> {
    const skip = (page - 1) * limit;

    const totalItems = await this.cinemaModel.countDocuments().exec();

    const data = await this.cinemaModel
      .find()
      .populate('cinema_system')
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách rạp thành công',
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findBySystem(systemId: string): Promise<Cinema[]> {
    return this.cinemaModel
      .find({ cinema_system: systemId })
      .populate('cinema_system')
      .exec();
  }

  async getCities(): Promise<string[]> {
    const cities = await this.cinemaModel.distinct('city').exec();
    return cities.filter((city) => city);
  }

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

  async findOne(id: string): Promise<Cinema> {
    const cinema = await this.cinemaModel
      .findById(id)
      .populate('cinema_system')
      .exec();
    if (!cinema) {
      throw new NotFoundException(`Không tìm thấy rạp với ID: ${id}`);
    }
    return cinema;
  }

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

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.cinemaModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Không tìm thấy rạp với ID: ${id}`);
    }
    return { message: 'Xóa rạp thành công' };
  }
}

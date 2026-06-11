import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CinemaSystem } from './schemas/cinema-system.schema';
import { CreateCinemaSystemDto } from './dto/create-cinema-system.dto';
import { UpdateCinemaSystemDto } from './dto/update-cinema-system.dto';

@Injectable()
export class CinemaSystemsService {
  constructor(
    @InjectModel(CinemaSystem.name)
    private cinemaSystemModel: Model<CinemaSystem>,
  ) {}

  async create(createDto: CreateCinemaSystemDto): Promise<CinemaSystem> {
    const newSystem = new this.cinemaSystemModel(createDto);
    return newSystem.save();
  }

  async findAll(): Promise<CinemaSystem[]> {
    return this.cinemaSystemModel.find().exec();
  }

  async findOne(id: string): Promise<CinemaSystem> {
    const system = await this.cinemaSystemModel.findById(id).exec();
    if (!system) {
      throw new NotFoundException(`Cinema system with id ${id} not found`);
    }
    return system;
  }

  async update(
    id: string,
    updateDto: UpdateCinemaSystemDto,
  ): Promise<CinemaSystem> {
    const updatedSystem = await this.cinemaSystemModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updatedSystem) {
      throw new NotFoundException(`Cinema system with id ${id} not found`);
    }
    return updatedSystem;
  }

  async remove(id: string): Promise<void> {
    const result = await this.cinemaSystemModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Cinema system with id ${id} not found`);
    }
  }
}

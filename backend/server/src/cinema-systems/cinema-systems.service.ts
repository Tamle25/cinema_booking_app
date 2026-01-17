import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CinemaSystem } from './schemas/cinema-system.schema';
import { CreateCinemaSystemDto } from './dto/create-cinema-system.dto';

@Injectable()
export class CinemaSystemsService {
  constructor(
    @InjectModel(CinemaSystem.name) private cinemaSystemModel: Model<CinemaSystem>,
  ) {}

  async create(createDto: CreateCinemaSystemDto): Promise<CinemaSystem> {
    const newSystem = new this.cinemaSystemModel(createDto);
    return newSystem.save();
  }

  async findAll(): Promise<CinemaSystem[]> {
    return this.cinemaSystemModel.find().exec();
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Combo } from './schemas/combo.schema';
import { Cinema } from '../cinemas/schemas/cinema.schema';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@Injectable()
export class CombosService {
  constructor(
    @InjectModel(Combo.name) private comboModel: Model<Combo>,
    @InjectModel(Cinema.name) private cinemaModel: Model<Cinema>,
  ) {}

  // Tạo combo mới
  async create(createComboDto: CreateComboDto): Promise<Combo> {
    const data: any = { ...createComboDto };
    if (createComboDto.cinema_system_id) {
      data.cinema_system = createComboDto.cinema_system_id;
    }
    const newCombo = new this.comboModel(data);
    return newCombo.save();
  }

  // Lấy danh sách combo đang active (cho user)
  async findActive(cinemaSystemId?: string, cinemaId?: string): Promise<Combo[]> {
    const query: any = { is_active: true };
    
    if (cinemaId) {
      const cinema = await this.cinemaModel.findById(cinemaId).exec();
      if (!cinema) throw new NotFoundException('Không tìm thấy rạp này');
      query.cinema_system = cinema.cinema_system;
    } else if (cinemaSystemId) {
      query.cinema_system = cinemaSystemId;
    }
    
    return this.comboModel
      .find(query)
      .populate('cinema_system', 'name')
      .sort({ is_popular: -1, createdAt: -1 })
      .exec();
  }

  // Lấy tất cả combo (cho admin)
  async findAll(cinemaSystemId?: string): Promise<Combo[]> {
    const query: any = {};
    if (cinemaSystemId) {
      query.cinema_system = cinemaSystemId;
    }
    return this.comboModel
      .find(query)
      .populate('cinema_system', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lấy combo theo ID
  async findOne(id: string): Promise<Combo> {
    const combo = await this.comboModel.findById(id).exec();
    if (!combo) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    return combo;
  }

  // Cập nhật combo
  async update(id: string, updateComboDto: UpdateComboDto): Promise<Combo> {
    const data: any = { ...updateComboDto };
    if (updateComboDto.cinema_system_id) {
      data.cinema_system = updateComboDto.cinema_system_id;
    }
    const updated = await this.comboModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    return updated;
  }

  // Xóa combo
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.comboModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    return { message: 'Xóa combo thành công' };
  }

  // Validate danh sách combo từ request booking
  async validateCombos(
    combos: Array<{ combo_id: string; quantity: number }>,
    cinemaId?: string,
  ): Promise<Array<{ combo_id: string; name: string; price: number; quantity: number }>> {
    const validatedCombos: Array<{ combo_id: string; name: string; price: number; quantity: number }> = [];

    let cinemaSystemId: string | undefined;
    if (cinemaId) {
      const cinema = await this.cinemaModel.findById(cinemaId).exec();
      if (cinema) cinemaSystemId = cinema.cinema_system.toString();
    }

    for (const item of combos) {
      const combo = await this.comboModel.findById(item.combo_id).exec();
      if (!combo) {
        throw new NotFoundException(`Combo với ID ${item.combo_id} không tồn tại`);
      }
      if (!combo.is_active) {
        throw new NotFoundException(`Combo "${combo.name}" hiện không còn bán`);
      }
      
      if (cinemaSystemId && combo.cinema_system?.toString() !== cinemaSystemId) {
        throw new NotFoundException(`Combo "${combo.name}" không thuộc về hệ thống rạp này`);
      }

      validatedCombos.push({
        combo_id: item.combo_id,
        name: combo.name,
        price: combo.price,
        quantity: item.quantity,
      });
    }

    return validatedCombos;
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { Cinema } from '../cinemas/schemas/cinema.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { Combo } from './schemas/combo.schema';

@Injectable()
export class CombosService {
  constructor(
    @InjectModel(Combo.name) private comboModel: Model<Combo>,
    @InjectModel(Cinema.name) private cinemaModel: Model<Cinema>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createComboDto: CreateComboDto): Promise<Combo> {
    const data: Record<string, unknown> = {
      ...createComboDto,
    };
    if (createComboDto.cinema_system_id) {
      data.cinema_system = createComboDto.cinema_system_id;
    }
    const newCombo = new this.comboModel(data);
    return newCombo.save();
  }

  async findActive(
    cinemaSystemId?: string,
    cinemaId?: string,
  ): Promise<Combo[]> {
    const query: FilterQuery<Combo> = { is_active: true };

    if (cinemaId) {
      const cinema = await this.cinemaModel.findById(cinemaId).exec();
      if (!cinema) throw new NotFoundException('Khong tim thay rap nay');
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

  async findAll(cinemaSystemId?: string): Promise<Combo[]> {
    const query: FilterQuery<Combo> = {};
    if (cinemaSystemId) {
      query.cinema_system = cinemaSystemId;
    }
    return this.comboModel
      .find(query)
      .populate('cinema_system', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Combo> {
    const combo = await this.comboModel.findById(id).exec();
    if (!combo) {
      throw new NotFoundException('Khong tim thay combo');
    }
    return combo;
  }

  async update(id: string, updateComboDto: UpdateComboDto): Promise<Combo> {
    const existing = await this.findOne(id);
    const data: UpdateQuery<Combo> & Record<string, unknown> = {
      ...updateComboDto,
    };
    if (updateComboDto.cinema_system_id) {
      data.cinema_system = updateComboDto.cinema_system_id;
    }

    const updated = await this.comboModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Khong tim thay combo');
    }

    await this.deleteReplacedComboImage(existing, updateComboDto);
    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.comboModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Khong tim thay combo');
    }
    await this.deleteComboImage(result);
    return { message: 'Xoa combo thanh cong' };
  }

  private async deleteReplacedComboImage(
    existing: Combo,
    updateComboDto: UpdateComboDto,
  ) {
    if (
      updateComboDto.image_url !== undefined &&
      existing.image_url &&
      existing.image_url !== updateComboDto.image_url
    ) {
      await this.deleteComboImage(existing);
    }
  }

  private async deleteComboImage(combo: Combo) {
    await this.cloudinaryService.destroyImage(
      combo.image_public_id ||
        this.cloudinaryService.extractPublicIdFromUrl(combo.image_url),
    );
  }

  async validateCombos(
    combos: Array<{ combo_id: string; quantity: number }>,
    cinemaId?: string,
  ): Promise<
    Array<{ combo_id: string; name: string; price: number; quantity: number }>
  > {
    const validatedCombos: Array<{
      combo_id: string;
      name: string;
      price: number;
      quantity: number;
    }> = [];

    let cinemaSystemId: string | undefined;
    if (cinemaId) {
      const cinema = await this.cinemaModel.findById(cinemaId).exec();
      if (cinema) {
        cinemaSystemId = this.getCinemaSystemId(
          cinema.cinema_system as unknown,
        );
      }
    }

    for (const item of combos) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('So luong combo khong hop le');
      }

      const combo = await this.comboModel.findById(item.combo_id).exec();
      if (!combo) {
        throw new NotFoundException(
          `Combo voi ID ${item.combo_id} khong ton tai`,
        );
      }
      if (!combo.is_active) {
        throw new NotFoundException(`Combo "${combo.name}" hien khong con ban`);
      }

      if (
        cinemaSystemId &&
        this.getCinemaSystemId(combo.cinema_system as unknown) !==
          cinemaSystemId
      ) {
        throw new NotFoundException(
          `Combo "${combo.name}" khong thuoc he thong rap nay`,
        );
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

  private getCinemaSystemId(cinemaSystem: unknown): string | undefined {
    if (typeof cinemaSystem === 'string') return cinemaSystem;

    if (this.isObjectIdLike(cinemaSystem)) {
      return cinemaSystem.toHexString();
    }

    if (
      cinemaSystem &&
      typeof cinemaSystem === 'object' &&
      '_id' in cinemaSystem
    ) {
      const id = (cinemaSystem as { _id?: unknown })._id;
      if (typeof id === 'string') return id;
      if (this.isObjectIdLike(id)) {
        return id.toHexString();
      }
    }

    return undefined;
  }

  private isObjectIdLike(
    value: unknown,
  ): value is { toHexString: () => string } {
    return (
      value !== null &&
      typeof value === 'object' &&
      'toHexString' in value &&
      typeof (value as { toHexString?: unknown }).toHexString === 'function'
    );
  }
}

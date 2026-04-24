import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CombosController } from './combos.controller';
import { CombosService } from './combos.service';
import { Combo, ComboSchema } from './schemas/combo.schema';
import { Cinema, CinemaSchema } from '../cinemas/schemas/cinema.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Combo.name, schema: ComboSchema },
      { name: Cinema.name, schema: CinemaSchema },
    ]),
  ],
  controllers: [CombosController],
  providers: [CombosService],
  exports: [CombosService, MongooseModule],
})
export class CombosModule {}

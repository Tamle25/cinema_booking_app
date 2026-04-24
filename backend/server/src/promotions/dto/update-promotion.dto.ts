import { CreatePromotionDto } from './create-promotion.dto';

// PartialType thủ công - tất cả field đều optional
export class UpdatePromotionDto implements Partial<CreatePromotionDto> {
  title?: string;
  description?: string;
  image?: string;
  type?: 'hot' | 'sale' | 'free' | 'event';
  discount_value?: number;
  start_date?: Date;
  end_date?: Date;
  is_active?: boolean;
}

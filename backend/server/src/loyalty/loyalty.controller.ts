import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoyaltyService } from './loyalty.service';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('membership')
  async getMembershipInfo(@Req() req: any) {
    const userId = req.user._id || req.user.id;
    return this.loyaltyService.getMembershipInfo(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('points-history')
  async getPointsHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user._id || req.user.id;
    return this.loyaltyService.getPointsHistory(
      userId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('membership-discount')
  async getMembershipDiscount(@Req() req: any) {
    const userId = req.user._id || req.user.id;
    const info = await this.loyaltyService.getMembershipInfo(userId);
    return {
      membershipRank: info.membershipRank,
      discountPercent: info.discountPercent,
    };
  }

  @AdminOnly()
  @Get('admin/user-points/:userId')
  async getUserPoints(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.loyaltyService.getMembershipInfo(userId);
  }

  @AdminOnly()
  @Get('admin/user-history/:userId')
  async getUserHistory(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.loyaltyService.getPointsHistory(
      userId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @AdminOnly()
  @Post('admin/adjust-points')
  async adjustPoints(
    @Req() req: any,
    @Body() body: { userId: string; points: number; description: string },
  ) {
    const adminId = req.user._id || req.user.id;
    if (!body.userId || body.points === undefined || !body.description) {
      throw new Error('Thiếu thông tin: userId, points, description');
    }
    return this.loyaltyService.adminAdjustPoints(
      adminId,
      body.userId,
      body.points,
      body.description,
    );
  }
}

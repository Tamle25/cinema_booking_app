import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { RolesGuard } from '../guards/roles.guard';

export const AdminOnly = () =>
  applyDecorators(UseGuards(AuthGuard('jwt'), RolesGuard), Roles('admin'));

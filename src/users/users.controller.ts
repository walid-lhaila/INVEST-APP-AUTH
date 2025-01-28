import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('getOne')
  @UseGuards(AuthGuard('keycloak'), RolesGuard)
  @Roles('Administrator')
  getStringOne(): string {
    return this.userService.getStringOne();
  }

  @Get('getTwo')
  @UseGuards(AuthGuard('keycloak'), RolesGuard)
  @Roles('Investor')
  getStringTwo(): string {
    return this.userService.getStringTwo();
  }
}

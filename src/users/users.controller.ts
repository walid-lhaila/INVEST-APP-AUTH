import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersDto } from './dto/users.dto';
import { Users } from './entity/users.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post('register')
  async createUser(@Body() userDto: UsersDto): Promise<Users> {
    console.log('Received data:', userDto);
    return this.userService.createUsers(userDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: { username: string; password: string },
  ): Promise<{ access_token: string; user: Users }> {
    return this.userService.login(loginDto.username, loginDto.password);
  }
}

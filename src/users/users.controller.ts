import { Body, Controller } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersDto } from './dto/users.dto';
import { Users } from './entity/users.entity';
import { MessagePattern } from '@nestjs/microservices';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @MessagePattern({ cmd: 'register' })
  async createUser(@Body() userDto: UsersDto): Promise<Users> {
    console.log('Received data:', userDto);
    return this.userService.createUsers(userDto);
  }

  @MessagePattern({ cmd: 'login' })
  async login(
    @Body() loginDto: { username: string; password: string },
  ): Promise<{ access_token: string; user: Users }> {
    return this.userService.login(loginDto.username, loginDto.password);
  }

  @MessagePattern({ cmd: 'getUserByUsername' })
  async getUserByUsername(@Body() data: { username: string }): Promise<Users> {
    console.log('Received username:', data.username);
    return this.userService.getUserByUsername(data.username);
  }
}

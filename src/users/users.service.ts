import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './entity/users.entity';
import { Repository } from 'typeorm';
import { UsersDto } from './dto/users.dto';
import axios from 'axios';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class UsersService {
  private keycloakUrl = this.config.get('KEYCLOAK_URL');
  private realm = this.config.get('KEYCLOAK_REALM');
  private clientId = this.config.get('KEYCLOAK_CLIENT_ID');
  private clientSecret = this.config.get('KEYCLOAK_CLIENT_SECRET');

  constructor(private config: ConfigService,
    @InjectRepository(Users) private usersRepository: Repository<Users>,
  ) {}

  async createUsers(userDto: UsersDto): Promise<Users> {
    // userDto.password = '';
    const user = this.usersRepository.create({
      ...userDto,
    });

    try {
      await this.createUsersInKeycloak(userDto);
      return await this.usersRepository.save(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new HttpException(
        'Failed To Create User',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserByUsername(username: string): Promise<Users> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private async createUsersInKeycloak(userDto: UsersDto): Promise<void> {
    try {
      console.log('Attempting to get access token...');
      const tokenResponse = await axios.post(
        `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      console.log('Access token obtained successfully');

      console.log('Attempting to create user in Keycloak...');
      const createUserResponse = await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        {
          username: userDto.username,
          email: userDto.email,
          enabled: true,
          firstName: userDto.firstName,
          lastName: userDto.lastName,
          attributes: {
            Phone: userDto.phone,
          },
          credentials: [
            {
              type: 'password',
              value: userDto.password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('User created successfully in Keycloak');

      const userId = createUserResponse.headers.location.split('/').pop();

      const assignedRoleId = await this.getRoleId(
        this.keycloakUrl,
        this.realm,
        accessToken,
        userDto.role,
      );

      await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        [{ id: assignedRoleId, name: userDto.role }],
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('role assigned to user in Keycloak');
    } catch (error) {
      console.error('Detailed error in Keycloak user creation:');
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      throw new HttpException(
        `Failed to create user in Keycloak: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getRoleId(
    keycloakUrl: string,
    realm: string,
    accessToken: string,
    roleName: string,
  ): Promise<string> {
    const rolesResponse = await axios.get(
      `${this.keycloakUrl}/admin/realms/${this.realm}/roles`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const role = rolesResponse.data.find((r) => r.name === roleName);
    if (!role) {
      throw new Error('Role Not Found In Keycloak');
    }
    return role.id;
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; user: Users }> {
    try {
      const loginResponse = await axios.post(
        `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: username,
          password: password,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      const user = await this.usersRepository.findOne({ where: { username } });
      if (!user) {
        throw new UnauthorizedException('User Not Found');
      }

      return {
        access_token: loginResponse.data.access_token,
        user: user,
      };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException('Login failed');
    }
  }
}

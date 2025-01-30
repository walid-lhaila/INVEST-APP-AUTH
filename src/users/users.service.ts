import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './entity/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersDto } from './dto/users.dto';
import axios from 'axios';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users) private usersRepository: Repository<Users>,
  ) {}

  async createUsers(userDto: UsersDto): Promise<Users> {
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = this.usersRepository.create({
      ...userDto,
      password: hashedPassword,
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

  private async createUsersInKeycloak(userDto: UsersDto): Promise<void> {
    const keycloakUrl = 'http://localhost:8080';
    const realm = 'Invest';
    const clientId = 'investLink';
    const clientSecret = 'JmjxcGqnWhbck4ffV4XOx1qe118X2ylf';

    try {
      console.log('Attempting to get access token...');
      const tokenResponse = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      console.log('Access token obtained successfully');

      console.log('Attempting to create user in Keycloak...');
      const createUserResponse = await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          username: userDto.username,
          email: userDto.email,
          enabled: true,
          firstName: userDto.firstName,
          lastName: userDto.lastName,
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

      const assignedRoleId = await this.getRoleId(keycloakUrl, realm, accessToken, userDto.role);

      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
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
      `${keycloakUrl}/admin/realms/${realm}/roles`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const role = rolesResponse.data.find((r) => r.name === roleName);
    if (!role) {
      throw new Error('HR Role Not Found In Keycloak');
    }
    return role.id;
  }
}

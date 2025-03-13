import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Users } from '../entity/users.entity';
import axios from 'axios';
import { UsersDto } from '../dto/users.dto';
import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

jest.mock('axios');

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(Users),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUsers', () => {
    it('should create a user successfully', async () => {
      const userDto: UsersDto = {
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        role: 'Investor',
        fieldOfInterest: 'Technology',
      };

      jest.mock('bcrypt', () => ({
        hash: jest.fn().mockResolvedValue('hashedpassword'),
      }));

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'mockAccessToken' },
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({
        headers: { location: '/admin/realms/Invest/users/mockUserId' },
      });

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: [
          { id: 'mock-investor-role-id', name: 'Investor' },
          { id: 'mock-entrepreneur-role-id', name: 'Entrepreneur' },
        ],
      });

      (axios.post as jest.Mock).mockResolvedValueOnce({});

      const mockUser = {
        ...userDto,
        password: 'hashedpassword',
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        fieldOfInterest: userDto.fieldOfInterest ?? '',
      };

      jest
        .spyOn(service['usersRepository'], 'save')
        .mockResolvedValue(mockUser);

      const result = await service.createUsers(userDto);

      expect(result).toEqual(mockUser);
    });

    it('should throw an error if Keycloak user creation fails', async () => {
      const userDto: UsersDto = {
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        role: 'Investor',
        fieldOfInterest: 'Technology',
      };

      jest.mock('bcrypt', () => ({
        hash: jest.fn().mockResolvedValue('hashedpassword'),
      }));

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'mockAccessToken' },
      });

      (axios.post as jest.Mock).mockRejectedValueOnce(
        new Error('Keycloak error'),
      );

      await expect(service.createUsers(userDto)).rejects.toThrow(
        new HttpException(
          'Failed To Create User',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('login', () => {
    it('should return an access token and user information on successful login', async () => {
      const loginDto = {
        username: 'testUser',
        password: 'testPassword',
      };

      const mockUser = {
        id: 1,
        username: 'testUser',
        password: 'hashedPassword',
        email: 'test@gmail.com',
        firstName: 'test',
        lastName: 'user',
        phone: '09876543',
        role: 'Investor',
        fieldOfInterest: 'tech',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'mockAccessToken' },
      });

      jest.spyOn(service['usersRepository'], 'findOne').mockResolvedValue(null);

      await expect(
        service.login(loginDto.username, loginDto.password),
      ).rejects.toThrow(new UnauthorizedException('Login failed'));
    });

    it('should throw an UnauthorizedException if the credentials are invalid', async () => {
      const loginDto = {
        username: 'testUser',
        password: 'wrongPassword',
      };

      (axios.post as jest.Mock).mockRejectedValueOnce({
        response: { status: 401, data: 'Invalid credentials' },
      });

      await expect(
        service.login(loginDto.username, loginDto.password),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });
  });

  describe('getUserByUsername', () => {
    it('should return a user if the username exists', async () => {
      const mockUser = {
        id: 1,
        username: 'testUser',
        password: 'hashedPassword',
        email: 'test@gmail.com',
        firstName: 'test',
        lastName: 'user',
        phone: '098765432',
        role: 'Investor',
        fieldOfInterest: 'tech',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(service['usersRepository'], 'findOne')
        .mockResolvedValue(mockUser as Users);

      const result = await service.getUserByUsername('testUser');

      expect(result).toEqual(mockUser);
      expect(service['usersRepository'].findOne).toHaveBeenCalledWith({
        where: { username: 'testUser' },
      });
    });

    it('should throw an HttpException if the username does not exist', async () => {
      jest.spyOn(service['usersRepository'], 'findOne').mockResolvedValue(null);

      await expect(
        service.getUserByUsername('nonexistentuser'),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service['usersRepository'].findOne).toHaveBeenCalledWith({
        where: { username: 'nonexistentuser' },
      });
    });
  });
});

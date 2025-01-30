import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: ['Entrepreneur', 'Investor'] })
  role: 'Entrepreneur' | 'Investor';

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  fieldOfInterest: string;

  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  companyDescription?: string;

  @Column({ nullable: true })
  services?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

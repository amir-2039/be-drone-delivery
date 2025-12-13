import { PrismaClient, User, UserType } from '@prisma/client';

const prisma = new PrismaClient();

export class UserRepository {
  /**
   * Find or create a user by name and type
   */
  async findOrCreate(name: string, type: UserType): Promise<User> {
    const user = await prisma.user.findUnique({
      where: {
        name_type: {
          name,
          type,
        },
      },
    });

    if (user) {
      return user;
    }

    return prisma.user.create({
      data: {
        name,
        type,
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by name and type
   */
  async findByNameAndType(name: string, type: UserType): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        name_type: {
          name,
          type,
        },
      },
    });
  }
}

export const userRepository = new UserRepository();

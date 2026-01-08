import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../../shared/lib/prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

interface JWTPayload {
  userId: number;
  username: string;
  email: string;
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  },

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  },

  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  },

  async login(username: string, password: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email: username }],
          isActive: true,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("Invalid credentials");
      }

      const isValidPassword = await this.verifyPassword(
        password,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      const token = this.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      const tokenHash = this.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          languagePreference: user.languagePreference,
          role: user.role,
        },
      };
    } catch (error) {
      console.error(
        "[AUTH] Login error:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  },

  async logout(userId: number, token: string) {
    const tokenHash = this.hashToken(token);

    await prisma.userSession.deleteMany({
      where: {
        userId,
        tokenHash,
      },
    });
  },

  async getCurrentUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        languagePreference: true,
        role: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  async cleanExpiredSessions() {
    await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  },

  async updateLanguagePreference(userId: number, language: string) {
    const languageEnum = language.toUpperCase() as "EN" | "JA";

    if (languageEnum !== "EN" && languageEnum !== "JA") {
      throw new Error("Invalid language preference");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { languagePreference: languageEnum },
    });
  },

  async invalidateUserSessions(userId: number) {
    await prisma.userSession.deleteMany({
      where: { userId },
    });
  },
};

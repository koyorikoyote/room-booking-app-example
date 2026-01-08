import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";
import prisma from "../../shared/lib/prisma";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role?: {
      id: number;
      name: string;
      level: number;
    };
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = authService.verifyToken(token);

      // Fetch user with role information from database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          role: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ error: "Account is inactive or not found" });
        return;
      }

      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

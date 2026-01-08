import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../../shared/lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { authService } from "../services/authService";

const router = Router();

// Middleware to check if user is admin (level 3)
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.role || req.user.role.level < 3) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }
  next();
};

// GET /api/users - Get all users
router.get(
  "/",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          isActive: true,
          languagePreference: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch users",
      });
    }
  }
);

// GET /api/users/:id - Get user by ID
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          isActive: true,
          languagePreference: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
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
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user",
      });
    }
  }
);

// POST /api/users - Create new user
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        username,
        email,
        password,
        name,
        roleId,
        isActive = true,
        languagePreference = "JA",
      } = req.body;

      // Validate required fields
      if (!username || !email || !password || !name || !roleId) {
        res.status(400).json({
          success: false,
          error: "Username, email, password, name, and role are required",
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          name,
          roleId: parseInt(roleId),
          isActive,
          languagePreference,
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          isActive: true,
          languagePreference: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: user,
        message: "User created successfully",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          error: "Username or email already exists",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Failed to create user",
      });
    }
  }
);

// PUT /api/users/:id - Update user
router.put(
  "/:id",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
        return;
      }

      const {
        username,
        email,
        name,
        password,
        roleId,
        isActive,
        languagePreference,
      } = req.body;

      const updateData: Record<string, unknown> = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (name !== undefined) updateData.name = name;
      if (roleId !== undefined) updateData.roleId = parseInt(roleId);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (languagePreference !== undefined)
        updateData.languagePreference = languagePreference;

      // Hash new password if provided
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          isActive: true,
          languagePreference: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      if (isActive === false) {
        await authService.invalidateUserSessions(userId);
      }

      res.json({
        success: true,
        data: user,
        message: "User updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "P2025") {
          res.status(404).json({
            success: false,
            error: "User not found",
          });
          return;
        }
        if (error.code === "P2002") {
          res.status(409).json({
            success: false,
            error: "Username or email already exists",
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: "Failed to update user",
      });
    }
  }
);

// DELETE /api/users/:id - Delete user
router.delete(
  "/:id",
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
        return;
      }

      // Prevent self-deletion
      if (req.user && req.user.userId === userId) {
        res.status(400).json({
          success: false,
          error: "You cannot delete your own account",
        });
        return;
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
      });
    }
  }
);

// POST /api/users/bulk-delete - Bulk delete users
router.post(
  "/bulk-delete",
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "Invalid user IDs",
        });
        return;
      }

      // Prevent self-deletion
      if (req.user && ids.includes(req.user.userId)) {
        res.status(400).json({
          success: false,
          error: "You cannot delete your own account",
        });
        return;
      }

      const result = await prisma.user.deleteMany({
        where: {
          id: {
            in: ids.map((id: string | number) => parseInt(id.toString())),
          },
        },
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} users`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error("Error bulk deleting users:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete users",
      });
    }
  }
);

// GET /api/users/roles - Get all user roles
router.get(
  "/roles/list",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const roles = await prisma.userRole.findMany({
        where: { isActive: true },
        orderBy: { level: "asc" },
      });

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch roles",
      });
    }
  }
);

export default router;

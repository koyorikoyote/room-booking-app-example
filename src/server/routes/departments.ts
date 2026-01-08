import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../shared/lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.role || req.user.role.level < 3) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }
  next();
};

router.get(
  "/",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
      });

      res.json({
        success: true,
        data: departments,
      });
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch departments",
      });
    }
  }
);

router.get(
  "/:id",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const departmentId = parseInt(id);

      if (isNaN(departmentId)) {
        res.status(400).json({
          success: false,
          error: "Invalid department ID",
        });
        return;
      }

      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        res.status(404).json({
          success: false,
          error: "Department not found",
        });
        return;
      }

      res.json({
        success: true,
        data: department,
      });
    } catch (error) {
      console.error("Error fetching department:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch department",
      });
    }
  }
);

router.post(
  "/",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, isActive = true } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: "Department name is required",
        });
        return;
      }

      const department = await prisma.department.create({
        data: {
          name,
          isActive,
        },
      });

      res.status(201).json({
        success: true,
        data: department,
        message: "Department created successfully",
      });
    } catch (error) {
      console.error("Error creating department:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          error: "Department name already exists",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Failed to create department",
      });
    }
  }
);

router.put(
  "/:id",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const departmentId = parseInt(id);

      if (isNaN(departmentId)) {
        res.status(400).json({
          success: false,
          error: "Invalid department ID",
        });
        return;
      }

      const { name, isActive } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (isActive !== undefined) updateData.isActive = isActive;

      const department = await prisma.department.update({
        where: { id: departmentId },
        data: updateData,
      });

      res.json({
        success: true,
        data: department,
        message: "Department updated successfully",
      });
    } catch (error) {
      console.error("Error updating department:", error);
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "P2025") {
          res.status(404).json({
            success: false,
            error: "Department not found",
          });
          return;
        }
        if (error.code === "P2002") {
          res.status(409).json({
            success: false,
            error: "Department name already exists",
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: "Failed to update department",
      });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const departmentId = parseInt(id);

      if (isNaN(departmentId)) {
        res.status(400).json({
          success: false,
          error: "Invalid department ID",
        });
        return;
      }

      await prisma.department.delete({
        where: { id: departmentId },
      });

      res.json({
        success: true,
        message: "Department deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting department:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          error: "Department not found",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Failed to delete department",
      });
    }
  }
);

router.post(
  "/bulk-delete",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "Invalid department IDs",
        });
        return;
      }

      const result = await prisma.department.deleteMany({
        where: {
          id: {
            in: ids.map((id: string | number) => parseInt(id.toString())),
          },
        },
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} departments`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error("Error bulk deleting departments:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete departments",
      });
    }
  }
);

export default router;

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
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: { code: "asc" },
      });

      res.json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch rooms",
      });
    }
  }
);

router.get(
  "/status",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: { code: "asc" },
      });

      const nowUTC = new Date();
      const nowJST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);
      const currentTime = `${String(nowJST.getUTCHours()).padStart(
        2,
        "0"
      )}:${String(nowJST.getUTCMinutes()).padStart(2, "0")}`;
      const today = new Date(
        Date.UTC(
          nowJST.getUTCFullYear(),
          nowJST.getUTCMonth(),
          nowJST.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      const currentDayOfWeek = nowJST.getUTCDay();

      const dayMap: { [key: number]: string[] } = {
        0: ["sunday", "sun"],
        1: ["monday", "mon"],
        2: ["tuesday", "tue"],
        3: ["wednesday", "wed"],
        4: ["thursday", "thu"],
        5: ["friday", "fri"],
        6: ["saturday", "sat"],
      };

      const roomStatuses = await Promise.all(
        rooms.map(async (room) => {
          const currentBooking = await prisma.booking.findFirst({
            where: {
              roomId: room.id,
              date: today,
              startTime: { lte: currentTime },
              endTime: { gte: currentTime },
            },
            include: {
              department: true,
            },
          });

          if (currentBooking) {
            return {
              id: room.id,
              code: room.code,
              name: room.name,
              isInUse: true,
              currentBooking: {
                startTime: currentBooking.startTime,
                endTime: currentBooking.endTime,
                department: currentBooking.department.name,
              },
            };
          }

          const recurringBooking = await prisma.booking.findFirst({
            where: {
              roomId: room.id,
              date: { lte: today },
              startTime: { lte: currentTime },
              endTime: { gte: currentTime },
              isRecurring: true,
            },
            include: {
              department: true,
            },
          });

          if (recurringBooking && recurringBooking.recurringDays) {
            const recurringDays = recurringBooking.recurringDays as string[];
            const currentDayNames = dayMap[currentDayOfWeek];
            const isRecurringToday = recurringDays.some((day) =>
              currentDayNames.includes(day.toLowerCase())
            );

            if (isRecurringToday) {
              return {
                id: room.id,
                code: room.code,
                name: room.name,
                isInUse: true,
                currentBooking: {
                  startTime: recurringBooking.startTime,
                  endTime: recurringBooking.endTime,
                  department: recurringBooking.department.name,
                },
              };
            }
          }

          return {
            id: room.id,
            code: room.code,
            name: room.name,
            isInUse: false,
            currentBooking: null,
          };
        })
      );

      res.json({
        success: true,
        data: roomStatuses,
      });
    } catch (error) {
      console.error("Error fetching room statuses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch room statuses",
      });
    }
  }
);

router.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const roomId = parseInt(id);

      if (isNaN(roomId)) {
        res.status(400).json({
          success: false,
          error: "Invalid room ID",
        });
        return;
      }

      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        res.status(404).json({
          success: false,
          error: "Room not found",
        });
        return;
      }

      res.json({
        success: true,
        data: room,
      });
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch room",
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
      const { code, name, capacity = 10, isActive = true } = req.body;

      if (!code || !name) {
        res.status(400).json({
          success: false,
          error: "Room code and name are required",
        });
        return;
      }

      const room = await prisma.room.create({
        data: {
          code,
          name,
          capacity: parseInt(capacity),
          isActive,
        },
      });

      res.status(201).json({
        success: true,
        data: room,
        message: "Room created successfully",
      });
    } catch (error) {
      console.error("Error creating room:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          error: "Room code already exists",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Failed to create room",
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
      const roomId = parseInt(id);

      if (isNaN(roomId)) {
        res.status(400).json({
          success: false,
          error: "Invalid room ID",
        });
        return;
      }

      const { code, name, capacity, isActive } = req.body;

      const updateData: Record<string, unknown> = {};
      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (capacity !== undefined) updateData.capacity = parseInt(capacity);
      if (isActive !== undefined) updateData.isActive = isActive;

      const room = await prisma.room.update({
        where: { id: roomId },
        data: updateData,
      });

      res.json({
        success: true,
        data: room,
        message: "Room updated successfully",
      });
    } catch (error) {
      console.error("Error updating room:", error);
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "P2025") {
          res.status(404).json({
            success: false,
            error: "Room not found",
          });
          return;
        }
        if (error.code === "P2002") {
          res.status(409).json({
            success: false,
            error: "Room code already exists",
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: "Failed to update room",
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
      const roomId = parseInt(id);

      if (isNaN(roomId)) {
        res.status(400).json({
          success: false,
          error: "Invalid room ID",
        });
        return;
      }

      await prisma.room.delete({
        where: { id: roomId },
      });

      res.json({
        success: true,
        message: "Room deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting room:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          error: "Room not found",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Failed to delete room",
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
          error: "Invalid room IDs",
        });
        return;
      }

      const result = await prisma.room.deleteMany({
        where: {
          id: {
            in: ids.map((id: string | number) => parseInt(id.toString())),
          },
        },
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} rooms`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error("Error bulk deleting rooms:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete rooms",
      });
    }
  }
);

export default router;

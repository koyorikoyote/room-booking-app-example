import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { bookingService } from "../services/bookingService";

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

const createBookingSchema = z.object({
  roomId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  repetition: z.array(z.string()).optional().default([]),
  remarks: z.string().optional(),
});

router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { roomId, startDate, endDate } = req.query;

      if (!roomId) {
        res.status(400).json({
          success: false,
          error: "Room ID is required",
        });
        return;
      }

      const bookings = await bookingService.getBookings(
        parseInt(roomId as string),
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch bookings",
      });
    }
  }
);

router.get(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookingId = parseInt(req.params.id);

      if (isNaN(bookingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid booking ID",
        });
        return;
      }

      const booking = await bookingService.getBookingById(bookingId);

      if (!booking) {
        res.status(404).json({
          success: false,
          error: "Booking not found",
        });
        return;
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch booking",
      });
    }
  }
);

router.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const validationResult = createBookingSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues,
        });
        return;
      }

      const bookingData = validationResult.data;
      const userId = req.user!.userId;

      const result = await bookingService.createBooking(userId, bookingData);

      if (!result.success && result.conflicts) {
        res.status(409).json({
          success: false,
          error: "Booking conflict detected",
          conflicts: result.conflicts,
        });
        return;
      }

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || "Failed to create booking",
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create booking",
      });
    }
  }
);

router.put(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookingId = parseInt(req.params.id);

      if (isNaN(bookingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid booking ID",
        });
        return;
      }

      const validationResult = createBookingSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues,
        });
        return;
      }

      const bookingData = validationResult.data;
      const userId = req.user!.userId;

      const result = await bookingService.updateBooking(
        bookingId,
        userId,
        bookingData
      );

      if (!result.success && result.error === "Booking not found") {
        res.status(404).json({
          success: false,
          error: "Booking not found",
        });
        return;
      }

      if (!result.success && result.error === "Unauthorized") {
        res.status(403).json({
          success: false,
          error: "You can only edit your own bookings",
        });
        return;
      }

      if (!result.success && result.conflicts) {
        res.status(409).json({
          success: false,
          error: "Booking conflict detected",
          conflicts: result.conflicts,
        });
        return;
      }

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || "Failed to update booking",
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update booking",
      });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookingId = parseInt(req.params.id);

      if (isNaN(bookingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid booking ID",
        });
        return;
      }

      const userId = req.user!.userId;

      const result = await bookingService.deleteBooking(bookingId, userId);

      if (!result.success && result.error === "Booking not found") {
        res.status(404).json({
          success: false,
          error: "Booking not found",
        });
        return;
      }

      if (!result.success && result.error === "Unauthorized") {
        res.status(403).json({
          success: false,
          error: "You can only delete your own bookings",
        });
        return;
      }

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || "Failed to delete booking",
        });
        return;
      }

      res.json({
        success: true,
        message: "Booking deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete booking",
      });
    }
  }
);

router.get(
  "/admin/all",
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { roomId, departmentId, startDate, endDate } = req.query;

      const bookings = await bookingService.getAllBookingsAdmin(
        roomId ? parseInt(roomId as string) : undefined,
        departmentId ? parseInt(departmentId as string) : undefined,
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch bookings",
      });
    }
  }
);

router.delete(
  "/admin/:id",
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookingId = parseInt(req.params.id);

      if (isNaN(bookingId)) {
        res.status(400).json({
          success: false,
          error: "Invalid booking ID",
        });
        return;
      }

      const result = await bookingService.deleteBookingAdmin(bookingId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: "Booking not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Booking deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete booking",
      });
    }
  }
);

router.post(
  "/admin/bulk-delete",
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "Invalid booking IDs",
        });
        return;
      }

      const result = await bookingService.bulkDeleteBookingsAdmin(
        ids.map((id: string | number) => parseInt(id.toString()))
      );

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} bookings`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error("Error bulk deleting bookings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete bookings",
      });
    }
  }
);

export default router;

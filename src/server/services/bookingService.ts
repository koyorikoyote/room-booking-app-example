import { BookingFormData, BookingConflict } from "../../shared/types/booking";
import { formatDateToJST } from "../../shared/utils/jstDateUtils";
import prisma from "../../shared/lib/prisma";
import { Prisma } from "@prisma/client";

interface BookingData {
  id: number;
  userId: number;
  date: Date;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringDays: string[] | null;
  parentId: number | null;
  department: {
    name: string;
  };
  room: {
    name: string;
  };
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const timeRangesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return s1 < e2 && s2 < e1;
};

const getRecurringDatesInMonth = (
  startDate: Date,
  weekdays: string[]
): Date[] => {
  const weekdayMap: { [key: string]: number } = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
  };

  const dates: Date[] = [];
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  for (const weekday of weekdays) {
    const targetDay = weekdayMap[weekday.toLowerCase()];
    if (targetDay === undefined) continue;

    for (let day = startDate.getUTCDate(); day <= lastDayOfMonth; day++) {
      const date = new Date(Date.UTC(year, month, day));
      if (date.getUTCDay() === targetDay) {
        dates.push(date);
      }
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
};

export const bookingService = {
  async getBookings(
    roomId: number,
    startDate?: string,
    endDate?: string
  ): Promise<BookingData[]> {
    const whereClause: {
      roomId: number;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      roomId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        const [year, month, day] = startDate.split("-").map(Number);
        whereClause.date.gte = new Date(Date.UTC(year, month - 1, day));
      }
      if (endDate) {
        const [year, month, day] = endDate.split("-").map(Number);
        whereClause.date.lte = new Date(Date.UTC(year, month - 1, day));
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        date: true,
        startTime: true,
        endTime: true,
        isRecurring: true,
        recurringDays: true,
        parentId: true,
        department: {
          select: {
            name: true,
          },
        },
        room: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return bookings.map((booking) => ({
      ...booking,
      recurringDays: booking.recurringDays as string[] | null,
    }));
  },

  async getBookingById(bookingId: number) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return null;
    }

    if (booking.parentId) {
      const parentBooking = await prisma.booking.findUnique({
        where: { id: booking.parentId },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (parentBooking) {
        return {
          ...booking,
          roomId: parentBooking.roomId,
          departmentId: parentBooking.departmentId,
          startTime: parentBooking.startTime,
          endTime: parentBooking.endTime,
          remarks: parentBooking.remarks,
          isRecurring: parentBooking.isRecurring,
          recurringDays: parentBooking.recurringDays,
          room: parentBooking.room,
          department: parentBooking.department,
        };
      }
    }

    return booking;
  },

  async detectConflicts(
    roomId: number,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<BookingConflict[]> {
    const dateOnly = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );

    const existingBookings = await prisma.booking.findMany({
      where: {
        roomId,
        date: dateOnly,
      },
      include: {
        department: true,
        room: true,
      },
    });

    const dayOfWeek = dateOnly.getUTCDay();
    const dayMap: { [key: number]: string[] } = {
      0: ["sunday", "sun"],
      1: ["monday", "mon"],
      2: ["tuesday", "tue"],
      3: ["wednesday", "wed"],
      4: ["thursday", "thu"],
      5: ["friday", "fri"],
      6: ["saturday", "sat"],
    };
    const currentDayNames = dayMap[dayOfWeek];

    const firstDayOfMonth = new Date(
      Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), 1)
    );
    const lastDayOfMonth = new Date(
      Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth() + 1, 0)
    );

    const recurringBookings = await prisma.booking.findMany({
      where: {
        roomId,
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
        isRecurring: true,
      },
      include: {
        department: true,
        room: true,
      },
    });

    const allBookings = [...existingBookings];

    recurringBookings.forEach((booking) => {
      if (booking.recurringDays) {
        const recurringDays = booking.recurringDays as string[];
        const isRecurringOnThisDay = recurringDays.some((day) =>
          currentDayNames.includes(day.toLowerCase())
        );

        if (isRecurringOnThisDay) {
          const alreadyExists = existingBookings.some(
            (b) =>
              b.date.getTime() === dateOnly.getTime() &&
              b.startTime === booking.startTime &&
              b.endTime === booking.endTime
          );

          if (!alreadyExists) {
            allBookings.push({
              ...booking,
              date: dateOnly,
            });
          }
        }
      }
    });

    const conflicts = allBookings.filter((booking) => {
      return timeRangesOverlap(
        startTime,
        endTime,
        booking.startTime,
        booking.endTime
      );
    });

    return conflicts.map((conflict) => ({
      existingBookingId: conflict.id,
      date: formatDateToJST(conflict.date),
      startTime: conflict.startTime,
      endTime: conflict.endTime,
      department: conflict.department.name,
      room: conflict.room.name,
    }));
  },

  async createBooking(
    userId: number,
    bookingData: BookingFormData
  ): Promise<{
    success: boolean;
    data?: unknown;
    conflicts?: BookingConflict[];
    error?: string;
  }> {
    const {
      roomId,
      departmentId,
      date,
      startTime,
      endTime,
      repetition,
      remarks,
    } = bookingData;

    const dateStr = date.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));

    if (repetition && repetition.length > 0) {
      const datesToBook = getRecurringDatesInMonth(bookingDate, repetition);
      const allConflicts: BookingConflict[] = [];

      for (const recurringDate of datesToBook) {
        const conflicts = await this.detectConflicts(
          roomId,
          recurringDate,
          startTime,
          endTime
        );

        if (conflicts.length > 0) {
          allConflicts.push(...conflicts);
        }
      }

      if (allConflicts.length > 0) {
        return {
          success: false,
          conflicts: allConflicts,
        };
      }

      const jstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);

      const parentBooking = await prisma.booking.create({
        data: {
          roomId,
          userId,
          departmentId,
          date: bookingDate,
          startTime,
          endTime,
          remarks,
          isRecurring: true,
          recurringDays: repetition,
          createdAt: jstNow,
          updatedAt: jstNow,
        },
      });

      for (const recurringDate of datesToBook) {
        if (recurringDate.getTime() !== bookingDate.getTime()) {
          const jstNowChild = new Date(
            new Date().getTime() + 9 * 60 * 60 * 1000
          );
          await prisma.booking.create({
            data: {
              roomId,
              userId,
              departmentId,
              date: recurringDate,
              startTime,
              endTime,
              remarks,
              isRecurring: false,
              parentId: parentBooking.id,
              createdAt: jstNowChild,
              updatedAt: jstNowChild,
            },
          });
        }
      }

      return {
        success: true,
        data: parentBooking,
      };
    } else {
      const conflicts = await this.detectConflicts(
        roomId,
        bookingDate,
        startTime,
        endTime
      );

      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts,
        };
      }

      const jstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);

      const booking = await prisma.booking.create({
        data: {
          roomId,
          userId,
          departmentId,
          date: bookingDate,
          startTime,
          endTime,
          remarks,
          isRecurring: false,
          createdAt: jstNow,
          updatedAt: jstNow,
        },
      });

      return {
        success: true,
        data: booking,
      };
    }
  },

  async updateBooking(
    bookingId: number,
    userId: number,
    bookingData: BookingFormData
  ): Promise<{
    success: boolean;
    data?: unknown;
    conflicts?: BookingConflict[];
    error?: string;
  }> {
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    if (existingBooking.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const {
      roomId,
      departmentId,
      date,
      startTime,
      endTime,
      repetition,
      remarks,
    } = bookingData;

    const dateStr = date.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));

    const targetBookingId = existingBooking.parentId || bookingId;
    const isChildBooking = existingBooking.parentId !== null;

    const parentBooking = isChildBooking
      ? await prisma.booking.findUnique({
          where: { id: existingBooking.parentId! },
        })
      : existingBooking;

    if (!parentBooking) {
      return {
        success: false,
        error: "Parent booking not found",
      };
    }

    const childBookings = await prisma.booking.findMany({
      where: { parentId: targetBookingId },
    });

    const allBookingIds = [targetBookingId, ...childBookings.map((b) => b.id)];

    const conflicts = await prisma.booking.findMany({
      where: {
        roomId,
        date: bookingDate,
        id: { notIn: allBookingIds },
      },
      include: {
        department: true,
        room: true,
      },
    });

    const overlappingConflicts = conflicts.filter((booking) => {
      return timeRangesOverlap(
        startTime,
        endTime,
        booking.startTime,
        booking.endTime
      );
    });

    if (overlappingConflicts.length > 0) {
      return {
        success: false,
        conflicts: overlappingConflicts.map((conflict) => ({
          existingBookingId: conflict.id,
          date: formatDateToJST(conflict.date),
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          department: conflict.department.name,
          room: conflict.room.name,
        })),
      };
    }

    if (repetition && repetition.length > 0) {
      const allDatesForNewPattern = getRecurringDatesInMonth(
        parentBooking.date,
        repetition
      );

      const datesToKeep = new Set<number>();
      datesToKeep.add(parentBooking.date.getTime());

      for (const recurringDate of allDatesForNewPattern) {
        if (recurringDate.getTime() !== parentBooking.date.getTime()) {
          datesToKeep.add(recurringDate.getTime());
        }
      }

      const childrenToRemove = childBookings.filter(
        (child) => !datesToKeep.has(child.date.getTime())
      );

      for (const child of childrenToRemove) {
        await prisma.booking.delete({
          where: { id: child.id },
        });
      }

      const remainingChildren = childBookings.filter((child) =>
        datesToKeep.has(child.date.getTime())
      );

      const existingChildDates = new Set(
        remainingChildren.map((child) => child.date.getTime())
      );

      const datesToAdd = allDatesForNewPattern.filter(
        (date) =>
          date.getTime() !== parentBooking.date.getTime() &&
          !existingChildDates.has(date.getTime())
      );

      for (const newDate of datesToAdd) {
        const conflictsForNewDate = await this.detectConflicts(
          roomId,
          newDate,
          startTime,
          endTime
        );

        if (conflictsForNewDate.length > 0) {
          return {
            success: false,
            conflicts: conflictsForNewDate,
          };
        }
      }

      const jstNowUpdate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);

      await prisma.booking.update({
        where: { id: targetBookingId },
        data: {
          roomId,
          departmentId,
          startTime,
          endTime,
          remarks,
          isRecurring: true,
          recurringDays: repetition,
          updatedAt: jstNowUpdate,
        },
      });

      for (const child of remainingChildren) {
        const jstNowChild = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
        await prisma.booking.update({
          where: { id: child.id },
          data: {
            roomId,
            departmentId,
            startTime,
            endTime,
            remarks,
            updatedAt: jstNowChild,
          },
        });
      }

      for (const newDate of datesToAdd) {
        const jstNowNew = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
        await prisma.booking.create({
          data: {
            roomId,
            userId,
            departmentId,
            date: newDate,
            startTime,
            endTime,
            remarks,
            isRecurring: false,
            parentId: targetBookingId,
            createdAt: jstNowNew,
            updatedAt: jstNowNew,
          },
        });
      }
    } else {
      const jstNowElse = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      await prisma.booking.update({
        where: { id: targetBookingId },
        data: {
          roomId,
          departmentId,
          startTime,
          endTime,
          remarks,
          isRecurring: false,
          recurringDays: Prisma.DbNull,
          updatedAt: jstNowElse,
        },
      });

      for (const child of childBookings) {
        await prisma.booking.delete({
          where: { id: child.id },
        });
      }
    }

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: targetBookingId },
    });

    return {
      success: true,
      data: updatedBooking,
    };
  },

  async deleteBooking(
    bookingId: number,
    userId: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    if (existingBooking.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const targetBookingId = existingBooking.parentId || bookingId;

    await prisma.booking.deleteMany({
      where: {
        OR: [{ id: targetBookingId }, { parentId: targetBookingId }],
      },
    });

    return {
      success: true,
    };
  },

  async getAllBookingsAdmin(
    roomId?: number,
    departmentId?: number,
    startDate?: string,
    endDate?: string
  ) {
    const whereClause: {
      roomId?: number;
      departmentId?: number;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (roomId) {
      whereClause.roomId = roomId;
    }

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        const [year, month, day] = startDate.split("-").map(Number);
        whereClause.date.gte = new Date(Date.UTC(year, month - 1, day));
      }
      if (endDate) {
        const [year, month, day] = endDate.split("-").map(Number);
        whereClause.date.lte = new Date(Date.UTC(year, month - 1, day));
      }
    }

    return await prisma.booking.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }],
    });
  },

  async deleteBookingAdmin(bookingId: number): Promise<{
    success: boolean;
  }> {
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return {
        success: false,
      };
    }

    const targetBookingId = existingBooking.parentId || bookingId;

    await prisma.booking.deleteMany({
      where: {
        OR: [{ id: targetBookingId }, { parentId: targetBookingId }],
      },
    });

    return {
      success: true,
    };
  },

  async bulkDeleteBookingsAdmin(ids: number[]): Promise<{ count: number }> {
    const result = await prisma.booking.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return { count: result.count };
  },
};

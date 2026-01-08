import prisma from "../../shared/lib/prisma";

export const roomService = {
  async getRooms() {
    return await prisma.room.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: "asc",
      },
    });
  },

  async getRoomsCurrentStatus() {
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    const nowJST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    const todayDate = new Date(
      Date.UTC(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate())
    );
    const currentTime = `${String(nowJST.getHours()).padStart(2, "0")}:${String(
      nowJST.getMinutes()
    ).padStart(2, "0")}`;

    const roomsWithStatus = await Promise.all(
      rooms.map(async (room) => {
        const todaysBookings = await prisma.booking.findMany({
          where: {
            roomId: room.id,
            date: todayDate,
          },
          include: {
            department: true,
          },
        });

        const currentBooking = todaysBookings.find((booking) => {
          return (
            booking.startTime <= currentTime && booking.endTime > currentTime
          );
        });

        return {
          id: room.id,
          code: room.code,
          name: room.name,
          isInUse: !!currentBooking,
          currentBooking: currentBooking
            ? {
                startTime: currentBooking.startTime,
                endTime: currentBooking.endTime,
                department: currentBooking.department.name,
              }
            : null,
        };
      })
    );

    return roomsWithStatus;
  },
};

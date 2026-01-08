import { PrismaClient } from "@prisma/client";

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log("Prisma truncate script: starting");

  // Delete in order that respects foreign keys: child records first
  try {
    // bookings -> userSessions -> users -> departments -> rooms
    const delBookings = await prisma.booking.deleteMany();
    console.log(`Deleted bookings: ${delBookings.count ?? 0}`);

    const delUserSessions = await prisma.userSession.deleteMany();
    console.log(`Deleted userSessions: ${delUserSessions.count ?? 0}`);

    const delDepartments = await prisma.department.deleteMany();
    console.log(`Deleted departments: ${delDepartments.count ?? 0}`);

    const delRooms = await prisma.room.deleteMany();
    console.log(`Deleted rooms: ${delRooms.count ?? 0}`);

    // Verification
    const verification = {
      users: await prisma.user.count(),
      rooms: await prisma.room.count(),
      departments: await prisma.department.count(),
      bookings: await prisma.booking.count(),
      userSessions: await prisma.userSession.count(),
    };

    console.log("Verification results:");
    console.log(JSON.stringify(verification, null, 2));

    const allZero = Object.values(verification).every(
      (v) => typeof v === "number" && v === 0
    );
    if (!allZero) {
      console.warn("Truncate warning: some tables still contain rows");
      process.exitCode = 2;
    } else {
      console.log("Truncate completed: all target tables are empty");
    }
  } catch (err) {
    console.error("Error during truncate:", err);
    throw err;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

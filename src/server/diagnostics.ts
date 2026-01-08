// Diagnostic script to check environment and database connection
import prisma from "../shared/lib/prisma";

async function runDiagnostics() {
  console.log("========================================");
  console.log("Room Booking App - Diagnostics");
  console.log("========================================");
  console.log("");

  // Check environment variables
  console.log("Environment Variables:");
  console.log("  NODE_ENV:", process.env.NODE_ENV);
  console.log("  PORT:", process.env.PORT);
  console.log(
    "  DATABASE_URL:",
    process.env.DATABASE_URL
      ? `${process.env.DATABASE_URL.substring(0, 20)}...`
      : "NOT SET"
  );
  console.log(
    "  JWT_SECRET:",
    process.env.JWT_SECRET ? "SET (hidden)" : "NOT SET"
  );
  console.log("");

  // Test database connection
  console.log("Testing Database Connection...");
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Check if users table exists and has data
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
        },
        take: 5,
      });
      console.log("Sample users:");
      users.forEach((user) => {
        console.log(
          `  - ${user.username} (${user.email}) - Active: ${user.isActive}`
        );
      });
    }

    // Check rooms
    const roomCount = await prisma.room.count();
    console.log(`✅ Found ${roomCount} rooms in database`);

    // Check departments
    const deptCount = await prisma.department.count();
    console.log(`✅ Found ${deptCount} departments in database`);
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }

  console.log("");
  console.log("========================================");
  console.log("Diagnostics Complete");
  console.log("========================================");
}

runDiagnostics()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Diagnostics failed:", error);
    process.exit(1);
  });

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.department.deleteMany();
  await prisma.room.deleteMany();

  console.log("Cleared existing data");

  // Seed User Roles
  const userRole = await prisma.userRole.create({
    data: {
      name: "User",
      description: "Basic user access",
      level: 1,
    },
  });

  const managerRole = await prisma.userRole.create({
    data: {
      name: "Manager",
      description: "Management access",
      level: 2,
    },
  });

  const adminRole = await prisma.userRole.create({
    data: {
      name: "Administrator",
      description: "Full system access",
      level: 3,
    },
  });

  console.log("Created user roles");

  // Seed Rooms
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        code: "A",
        name: "Conference Room A",
        capacity: 6,
        isActive: true,
      },
    }),
    prisma.room.create({
      data: {
        code: "B",
        name: "Conference Room B",
        capacity: 6,
        isActive: true,
      },
    }),
    prisma.room.create({
      data: {
        code: "C",
        name: "Conference Room C",
        capacity: 8,
        isActive: true,
      },
    }),
    prisma.room.create({
      data: {
        code: "D",
        name: "Conference Room D",
        capacity: 16,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${rooms.length} rooms`);

  // Seed Departments
  const departments = await prisma.department.createMany({
    data: [
      { name: "流通事業部", isActive: true },
      { name: "開発事業部", isActive: true },
      { name: "企画室", isActive: true },
      { name: "ソリューション事業部", isActive: true },
      { name: "総務部", isActive: true },
      { name: "国際事業部", isActive: true },
    ],
  });

  console.log(`Created ${departments.count} departments`);

  // Seed Test Users
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: "admin",
        email: "admin@company.com",
        passwordHash: hashedPassword,
        name: "Admin User",
        isActive: true,
        languagePreference: "JA",
        roleId: adminRole.id,
      },
    }),
  ]);

  console.log(`Created ${users.length} test users`);
  console.log(
    "Test user credentials: username/admin123 (admin role), tanaka/admin123 (user role), suzuki/admin123 (manager role)"
  );

  console.log("Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

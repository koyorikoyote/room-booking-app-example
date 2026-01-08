import prisma from "../../shared/lib/prisma";

interface DepartmentData {
  id: number;
  name: string;
}

export const departmentService = {
  async getDepartments(): Promise<DepartmentData[]> {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return departments;
  },
};

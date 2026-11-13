const prisma = require("../src/lib/prisma");
const bcrypt = require("bcryptjs");

async function seedManager() {
  try {
    // Cari role Procurement Manager
    const managerRole = await prisma.role.findUnique({
      where: {
        name: "PROCUREMENT_MANAGER",
      },
    });

    if (!managerRole) {
      throw new Error(
        "Role PROCUREMENT_MANAGER tidak ditemukan. Jalankan seed roles terlebih dahulu.",
      );
    }

    // Periksa apakah akun sudah tersedia
    const existingUser = await prisma.user.findUnique({
      where: {
        email: "manager@procurepro.com",
      },
    });

    if (existingUser) {
      console.log("Akun Procurement Manager sudah tersedia.");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("Manager123!", 10);

    // Buat akun manager
    const manager = await prisma.user.create({
      data: {
        name: "Procurement Manager",
        email: "manager@procurepro.com",
        passwordHash: hashedPassword,
        roleId: managerRole.id,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    console.log("Akun Procurement Manager berhasil dibuat!");
    console.log({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: manager.role.name,
      isActive: manager.isActive,
    });
  } catch (error) {
    console.error("Gagal membuat akun manager:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seedManager();

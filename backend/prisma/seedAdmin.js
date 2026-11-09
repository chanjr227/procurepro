const prisma = require("../src/lib/prisma");
const bcrypt = require("bcryptjs");

async function main() {
  const email = "admin@procurepro.com";
  const password = "Admin12345!";

  // Cari role SUPER_ADMIN
  const role = await prisma.role.findUnique({
    where: {
      name: "SUPER_ADMIN",
    },
  });

  if (!role) {
    throw new Error("Role SUPER_ADMIN tidak ditemukan!");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Buat atau perbarui akun administrator
  const admin = await prisma.user.upsert({
    where: {
      email: email,
    },
    update: {
      name: "Administrator",
      passwordHash: passwordHash,
      roleId: role.id,
      isActive: true,
    },
    create: {
      name: "Administrator",
      email: email,
      passwordHash: passwordHash,
      roleId: role.id,
      isActive: true,
    },
  });

  console.log("Administrator berhasil dibuat!");
  console.log("Email:", admin.email);
  console.log("Role:", role.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

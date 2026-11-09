const prisma = require("../src/lib/prisma");

async function main() {
  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Mengelola seluruh sistem ProcurePro",
    },
    {
      name: "PROCUREMENT_MANAGER",
      description: "Mengawasi proses pengadaan perusahaan",
    },
    {
      name: "PROCUREMENT_STAFF",
      description: "Mengelola permintaan dan pembelian barang",
    },
    {
      name: "FINANCE",
      description: "Mengelola invoice dan pembayaran",
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  console.log("Data role berhasil dibuat!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

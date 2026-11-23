const prisma = require("../lib/prisma");

const roles = [
  {
    name: "SUPER_ADMIN",
    description: "Mengelola seluruh sistem dan pengguna.",
  },
  {
    name: "PROCUREMENT_MANAGER",
    description: "Mengawasi pengadaan dan persetujuan.",
  },
  {
    name: "PROCUREMENT_STAFF",
    description: "Mengelola requisition dan purchase order.",
  },
  {
    name: "WAREHOUSE_MANAGER",
    description: "Mengawasi gudang dan persediaan.",
  },
  {
    name: "WAREHOUSE_STAFF",
    description: "Mengelola penerimaan dan transaksi stok.",
  },
  {
    name: "FINANCE",
    description: "Mengelola invoice dan pembayaran.",
  },
  {
    name: "REQUESTER",
    description: "Membuat dan memantau permintaan barang.",
  },
  {
    name: "AUDITOR",
    description: "Melihat laporan dan riwayat transaksi.",
  },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  console.log("Berhasil menyiapkan 8 role ProcurePro.");
}

main()
  .catch((error) => {
    console.error("Gagal menyiapkan role:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

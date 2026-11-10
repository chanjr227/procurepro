const prisma = require("../lib/prisma");

const allowedStatuses = ["PENDING", "ACTIVE", "INACTIVE"];

const allowedFields = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "taxNumber",
  "address",
  "city",
  "country",
  "website",
  "status",
];

function cleanVendorData(body) {
  const data = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const optionalFields = [
    "contactName",
    "email",
    "phone",
    "taxNumber",
    "address",
    "city",
    "country",
    "website",
  ];

  for (const field of optionalFields) {
    if (data[field] === "") {
      data[field] = null;
    }
  }

  return data;
}

// GET: Semua vendor
const getVendors = async (req, res) => {
  try {
    const { search = "", status } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { companyName: { contains: String(search) } },
        { vendorCode: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status vendor tidak valid.",
        });
      }

      where.status = status;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      total: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Get vendors error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data vendor.",
    });
  }
};

// GET: Detail vendor
const getVendorById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "ID vendor tidak valid.",
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("Get vendor error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail vendor.",
    });
  }
};

// POST: Tambah vendor
const createVendor = async (req, res) => {
  try {
    const data = cleanVendorData(req.body || {});

    if (!data.companyName || !String(data.companyName).trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama perusahaan wajib diisi.",
      });
    }

    data.companyName = String(data.companyName).trim();

    if (data.status && !allowedStatuses.includes(data.status)) {
      return res.status(400).json({
        success: false,
        message: "Status vendor tidak valid.",
      });
    }

    if (data.email) {
      data.email = String(data.email).trim().toLowerCase();
    }

    const vendor = await prisma.vendor.create({
      data: {
        ...data,
        vendorCode: `VEN-${Date.now()}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vendor berhasil ditambahkan.",
      data: vendor,
    });
  } catch (error) {
    console.error("Create vendor error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email vendor sudah digunakan.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan vendor.",
    });
  }
};

// PUT: Edit vendor
const updateVendor = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "ID vendor tidak valid.",
      });
    }

    const data = cleanVendorData(req.body || {});

    if (data.companyName !== undefined) {
      if (!String(data.companyName).trim()) {
        return res.status(400).json({
          success: false,
          message: "Nama perusahaan tidak boleh kosong.",
        });
      }

      data.companyName = String(data.companyName).trim();
    }

    if (data.status && !allowedStatuses.includes(data.status)) {
      return res.status(400).json({
        success: false,
        message: "Status vendor tidak valid.",
      });
    }

    if (data.email) {
      data.email = String(data.email).trim().toLowerCase();
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      message: "Data vendor berhasil diperbarui.",
      data: vendor,
    });
  } catch (error) {
    console.error("Update vendor error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Vendor tidak ditemukan.",
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email vendor sudah digunakan.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui vendor.",
    });
  }
};

// DELETE: Hapus vendor
const deleteVendor = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "ID vendor tidak valid.",
      });
    }

    await prisma.vendor.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Vendor berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete vendor error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Vendor tidak ditemukan.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal menghapus vendor.",
    });
  }
};

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
};

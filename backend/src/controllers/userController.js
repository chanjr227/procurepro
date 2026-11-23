const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "PROCUREMENT_MANAGER",
  "PROCUREMENT_STAFF",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "FINANCE",
  "REQUESTER",
  "AUDITOR",
];

const userSelect = {
  id: true,
  name: true,
  email: true,
  roleId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
};

// Mengambil daftar pengguna dan ringkasan.
const getUsers = async (req, res) => {
  try {
    const { search = "", role = "", status = "" } = req.query;

    const where = {};

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
      ];
    }

    if (role && ALLOWED_ROLES.includes(role)) {
      where.role = { name: role };
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [users, totalUsers, activeUsers, inactiveUsers, roles] =
      await Promise.all([
        prisma.user.findMany({
          where,
          select: userSelect,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.role.count(),
      ]);

    return res.json({
      success: true,
      data: {
        users,
        summary: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          totalRoles: roles,
        },
      },
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengguna.",
    });
  }
};

// Mengambil daftar role.
const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: {
        name: { in: ALLOWED_ROLES },
      },
      orderBy: { id: "asc" },
    });

    return res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Get Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar role.",
    });
  }
};

// Membuat pengguna baru.
const createUser = async (req, res) => {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password || !roleName) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, password, dan role wajib diisi.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter.",
      });
    }

    if (!ALLOWED_ROLES.includes(roleName)) {
      return res.status(400).json({
        success: false,
        message: "Role tidak diizinkan.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan.",
      });
    }

    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role belum tersedia di database. Jalankan seedRoles.js.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
      select: userSelect,
    });

    return res.status(201).json({
      success: true,
      message: "Pengguna berhasil ditambahkan.",
      data: user,
    });
  } catch (error) {
    console.error("Create User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan pengguna.",
    });
  }
};

// Mengubah nama, email, dan role pengguna.
const updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, roleName } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID pengguna tidak valid.",
      });
    }

    if (!name || !email || !roleName) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan role wajib diisi.",
      });
    }

    if (!ALLOWED_ROLES.includes(roleName)) {
      return res.status(400).json({
        success: false,
        message: "Role tidak diizinkan.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    // Super Admin tidak boleh mengubah role akunnya sendiri.
    if (id === req.user.userId && roleName !== req.user.role) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat mengubah role akun sendiri.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id },
      },
    });

    if (duplicateEmail) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan pengguna lain.",
      });
    }

    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role tidak ditemukan.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
        email: normalizedEmail,
        roleId: role.id,
      },
      select: userSelect,
    });

    return res.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengguna.",
    });
  }
};

// Mengaktifkan atau menonaktifkan akun.
const updateUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID pengguna tidak valid.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Status akun harus berupa boolean.",
      });
    }

    if (id === req.user.userId && !isActive) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menonaktifkan akun sendiri.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    });

    return res.json({
      success: true,
      message: isActive
        ? "Akun berhasil diaktifkan."
        : "Akun berhasil dinonaktifkan.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update User Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengubah status akun.",
    });
  }
};

// Mengatur password baru untuk pengguna.
const resetUserPassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { password } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID pengguna tidak valid.",
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 8 karakter.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: "Password pengguna berhasil diubah.",
    });
  } catch (error) {
    console.error("Reset User Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengubah password pengguna.",
    });
  }
};

module.exports = {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
};

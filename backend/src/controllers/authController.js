const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi!",
      });
    }

    // Cari pengguna berdasarkan email
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah!",
      });
    }

    // Periksa status akun
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun Anda sedang dinonaktifkan!",
      });
    }

    // Verifikasi password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah!",
      });
    }

    // Pastikan JWT_SECRET tersedia
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET belum dikonfigurasi!");
    }

    // Buat token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Login berhasil!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server!",
    });
  }
};

module.exports = {
  login,
};

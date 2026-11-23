const prisma = require("../lib/prisma");

// GET /api/notifications
// Mengambil notifikasi milik pengguna yang sedang login.
const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.user.userId);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return res.json({
      success: true,
      message: "Notifikasi berhasil diambil.",
      data: {
        unreadCount,
        notifications,
      },
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil notifikasi.",
    });
  }
};

// PATCH /api/notifications/:id/read
// Menandai satu notifikasi sebagai sudah dibaca.
const markNotificationAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Notification ID tidak valid.",
      });
    }

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notifikasi tidak ditemukan.",
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({
      success: true,
      message: "Notifikasi berhasil ditandai sudah dibaca.",
      data: updated,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui notifikasi.",
    });
  }
};

// PATCH /api/notifications/read-all
// Menandai semua notifikasi pengguna sebagai sudah dibaca.
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.userId);

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.json({
      success: true,
      message: "Semua notifikasi berhasil ditandai sudah dibaca.",
    });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui notifikasi.",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

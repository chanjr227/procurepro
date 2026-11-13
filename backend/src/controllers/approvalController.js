const prisma = require("../lib/prisma");

// ==========================================
// HELPER: Memeriksa hak akses approver
// ==========================================
const checkApprover = (req, res) => {
  const allowedRoles = ["SUPER_ADMIN", "PROCUREMENT_MANAGER"];

  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses untuk melakukan approval.",
    });

    return false;
  }

  return true;
};

// ==========================================
// HELPER: Mengambil data requisition dengan aman
// Tidak mengirim passwordHash ke frontend
// ==========================================
const requisitionInclude = {
  requestedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: true,
};

// ==========================================
// GET: Daftar pengajuan yang menunggu approval
// ==========================================
const getPendingApprovals = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const requisitions = await prisma.requisition.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        ...requisitionInclude,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      message: "Daftar pengajuan pending berhasil diambil.",
      data: requisitions,
    });
  } catch (error) {
    console.error("Get Pending Approvals Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data approval.",
    });
  }
};

// ==========================================
// GET: Detail pengajuan berdasarkan ID
// ==========================================
const getApprovalDetail = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    const requisition = await prisma.requisition.findUnique({
      where: { id },
      include: {
        ...requisitionInclude,

        approvalHistory: {
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Requisition tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    console.error("Get Approval Detail Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail approval.",
    });
  }
};

// ==========================================
// POST: Menyetujui pengajuan
// ==========================================
const approveRequisition = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const id = Number(req.params.id);
    const userId = Number(req.user.userId);
    const comments =
      typeof req.body.comments === "string"
        ? req.body.comments.trim() || null
        : null;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Cari requisition
      const requisition = await tx.requisition.findUnique({
        where: { id },
      });

      if (!requisition) {
        const error = new Error("Requisition tidak ditemukan.");
        error.statusCode = 404;
        throw error;
      }

      // Mencegah approval sendiri
      if (requisition.requestedById === userId) {
        const error = new Error(
          "Anda tidak dapat menyetujui pengajuan sendiri.",
        );
        error.statusCode = 403;
        throw error;
      }

      // Periksa status
      if (requisition.status !== "PENDING") {
        const error = new Error("Pengajuan ini tidak lagi menunggu approval.");
        error.statusCode = 400;
        throw error;
      }

      // Update status secara atomik
      const updated = await tx.requisition.updateMany({
        where: {
          id,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          approvedById: userId,
          rejectionReason: null,
        },
      });

      if (updated.count === 0) {
        const error = new Error("Pengajuan sudah diproses oleh pengguna lain.");
        error.statusCode = 409;
        throw error;
      }

      // Simpan riwayat approval
      await tx.approvalHistory.create({
        data: {
          requisitionId: id,
          actorId: userId,
          action: "APPROVED",
          comments,
        },
      });

      // Ambil data terbaru
      return await tx.requisition.findUnique({
        where: { id },
        include: requisitionInclude,
      });
    });

    return res.json({
      success: true,
      message: "Requisition berhasil disetujui.",
      data: result,
    });
  } catch (error) {
    console.error("Approve Requisition Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Gagal menyetujui requisition.",
    });
  }
};

// ==========================================
// POST: Menolak pengajuan
// ==========================================
const rejectRequisition = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const id = Number(req.params.id);
    const userId = Number(req.user.userId);

    const comments =
      typeof req.body.comments === "string" ? req.body.comments.trim() : "";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    // Alasan penolakan wajib diisi
    if (!comments) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan wajib diisi.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Cari requisition
      const requisition = await tx.requisition.findUnique({
        where: { id },
      });

      if (!requisition) {
        const error = new Error("Requisition tidak ditemukan.");
        error.statusCode = 404;
        throw error;
      }

      // Mencegah penolakan sendiri
      if (requisition.requestedById === userId) {
        const error = new Error("Anda tidak dapat menolak pengajuan sendiri.");
        error.statusCode = 403;
        throw error;
      }

      // Periksa status
      if (requisition.status !== "PENDING") {
        const error = new Error("Pengajuan ini tidak lagi menunggu approval.");
        error.statusCode = 400;
        throw error;
      }

      // Update status secara atomik
      const updated = await tx.requisition.updateMany({
        where: {
          id,
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          approvedById: userId,
          rejectionReason: comments,
        },
      });

      if (updated.count === 0) {
        const error = new Error("Pengajuan sudah diproses oleh pengguna lain.");
        error.statusCode = 409;
        throw error;
      }

      // Simpan riwayat penolakan
      await tx.approvalHistory.create({
        data: {
          requisitionId: id,
          actorId: userId,
          action: "REJECTED",
          comments,
        },
      });

      // Ambil data terbaru
      return await tx.requisition.findUnique({
        where: { id },
        include: requisitionInclude,
      });
    });

    return res.json({
      success: true,
      message: "Requisition berhasil ditolak.",
      data: result,
    });
  } catch (error) {
    console.error("Reject Requisition Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Gagal menolak requisition.",
    });
  }
};

// ==========================================
// GET: Semua riwayat approval
// ==========================================
const getApprovalHistory = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const history = await prisma.approvalHistory.findMany({
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requisition: {
          select: {
            id: true,
            requestNumber: true,
            title: true,
            department: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      message: "Riwayat approval berhasil diambil.",
      data: history,
    });
  } catch (error) {
    console.error("Approval History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat approval.",
    });
  }
};

// ==========================================
// EXPORT CONTROLLER
// ==========================================
module.exports = {
  getPendingApprovals,
  getApprovalDetail,
  approveRequisition,
  rejectRequisition,
  getApprovalHistory,
};

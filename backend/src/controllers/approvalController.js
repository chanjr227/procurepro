const prisma = require("../lib/prisma");

// ==========================================
// HELPER: Memeriksa hak akses approver
// ==========================================
// Memastikan pengguna memiliki hak untuk memproses persetujuan.
const checkApprover = (req, res) => {
  const allowedRoles = ["SUPER_ADMIN", "PROCUREMENT_MANAGER"];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses untuk melakukan approval.",
    });

    return false;
  }

  return true;
};

// ==========================================
// HELPER: Mengambil ID user yang login
// ==========================================
// Mengambil ID pengguna dari informasi autentikasi pada request.
const getUserId = (req) => {
  const userId = Number(req.user?.userId);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

// ==========================================
// INCLUDE REQUISITION
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
// GET: PENDING APPROVALS
// ==========================================
// Menampilkan requisition yang menunggu persetujuan pengguna.
const getPendingApprovals = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const requisitions = await prisma.requisition.findMany({
      where: {
        status: "PENDING",
      },
      include: requisitionInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
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
// GET: DETAIL APPROVAL
// ==========================================
// Mengambil rincian requisition yang akan ditinjau.
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

    return res.status(200).json({
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
// POST: APPROVE REQUISITION
// ==========================================
// Menyetujui requisition dan memperbarui statusnya.
const approveRequisition = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const id = Number(req.params.id);
    const userId = getUserId(req);

    const comments =
      typeof req.body?.comments === "string"
        ? req.body.comments.trim() || null
        : null;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "ID pengguna login tidak valid. Silakan login kembali.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Pastikan requisition tersedia
      const requisition = await tx.requisition.findUnique({
        where: { id },
      });

      if (!requisition) {
        const error = new Error("Requisition tidak ditemukan.");
        error.statusCode = 404;
        throw error;
      }

      // User tidak boleh menyetujui pengajuan sendiri
      if (Number(requisition.requestedById) === userId) {
        const error = new Error(
          "Anda tidak dapat menyetujui pengajuan sendiri.",
        );
        error.statusCode = 403;
        throw error;
      }

      // Pastikan status masih pending
      if (requisition.status !== "PENDING") {
        const error = new Error(
          `Pengajuan sudah diproses. Status saat ini: ${requisition.status}.`,
        );
        error.statusCode = 409;
        throw error;
      }

      // Update status requisition
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

      if (updated.count !== 1) {
        const error = new Error(
          "Status requisition gagal diperbarui atau sudah diproses pengguna lain.",
        );
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

      // Ambil data terbaru setelah update
      const updatedRequisition = await tx.requisition.findUnique({
        where: { id },
        include: requisitionInclude,
      });

      if (!updatedRequisition || updatedRequisition.status !== "APPROVED") {
        const error = new Error(
          "Status requisition belum berhasil diperbarui.",
        );
        error.statusCode = 500;
        throw error;
      }

      return updatedRequisition;
    });

    return res.status(200).json({
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
        : "Gagal menyetujui requisition. Periksa log backend.",
    });
  }
};

// ==========================================
// POST: REJECT REQUISITION
// ==========================================
// Menolak requisition dan mencatat alasan penolakannya.
const rejectRequisition = async (req, res) => {
  try {
    if (!checkApprover(req, res)) return;

    const id = Number(req.params.id);
    const userId = getUserId(req);

    const comments =
      typeof req.body?.comments === "string" ? req.body.comments.trim() : "";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID requisition tidak valid.",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "ID pengguna login tidak valid. Silakan login kembali.",
      });
    }

    if (!comments) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan wajib diisi.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const requisition = await tx.requisition.findUnique({
        where: { id },
      });

      if (!requisition) {
        const error = new Error("Requisition tidak ditemukan.");
        error.statusCode = 404;
        throw error;
      }

      if (Number(requisition.requestedById) === userId) {
        const error = new Error("Anda tidak dapat menolak pengajuan sendiri.");
        error.statusCode = 403;
        throw error;
      }

      if (requisition.status !== "PENDING") {
        const error = new Error(
          `Pengajuan sudah diproses. Status saat ini: ${requisition.status}.`,
        );
        error.statusCode = 409;
        throw error;
      }

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

      if (updated.count !== 1) {
        const error = new Error("Pengajuan sudah diproses pengguna lain.");
        error.statusCode = 409;
        throw error;
      }

      await tx.approvalHistory.create({
        data: {
          requisitionId: id,
          actorId: userId,
          action: "REJECTED",
          comments,
        },
      });

      return tx.requisition.findUnique({
        where: { id },
        include: requisitionInclude,
      });
    });

    return res.status(200).json({
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
// GET: APPROVAL HISTORY
// ==========================================
// Menampilkan riwayat persetujuan yang telah diproses.
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

    return res.status(200).json({
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
// EXPORT
// ==========================================
module.exports = {
  getPendingApprovals,
  getApprovalDetail,
  approveRequisition,
  rejectRequisition,
  getApprovalHistory,
};

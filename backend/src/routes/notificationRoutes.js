const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

router.use(authenticate);

router.get("/", getNotifications);

// Letakkan route read-all sebelum route dengan parameter :id.
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;

-- CreateTable
CREATE TABLE `approval_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requisitionId` INTEGER NOT NULL,
    `actorId` INTEGER NOT NULL,
    `action` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `comments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `approval_history_requisitionId_idx`(`requisitionId`),
    INDEX `approval_history_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `approval_history` ADD CONSTRAINT `approval_history_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `requisitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_history` ADD CONSTRAINT `approval_history_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

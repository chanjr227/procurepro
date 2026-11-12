-- CreateTable
CREATE TABLE `requisitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestNumber` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `department` VARCHAR(100) NOT NULL,
    `neededDate` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `requestedById` INTEGER NOT NULL,
    `approvedById` INTEGER NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `requisitions_requestNumber_key`(`requestNumber`),
    INDEX `requisitions_status_idx`(`status`),
    INDEX `requisitions_requestedById_idx`(`requestedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requisition_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requisitionId` INTEGER NOT NULL,
    `itemName` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `estimatedUnitPrice` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `requisition_items_requisitionId_idx`(`requisitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `requisitions` ADD CONSTRAINT `requisitions_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisitions` ADD CONSTRAINT `requisitions_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requisition_items` ADD CONSTRAINT `requisition_items_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `requisitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

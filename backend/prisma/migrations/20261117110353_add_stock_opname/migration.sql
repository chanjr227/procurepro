-- CreateTable
CREATE TABLE `stock_opnames` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opnameNumber` VARCHAR(50) NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `opnameDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `status` ENUM('DRAFT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_opnames_opnameNumber_key`(`opnameNumber`),
    INDEX `stock_opnames_warehouseId_idx`(`warehouseId`),
    INDEX `stock_opnames_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_opname_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stockOpnameId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `systemStock` INTEGER NOT NULL,
    `physicalStock` INTEGER NOT NULL,
    `difference` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_opname_items_inventoryItemId_idx`(`inventoryItemId`),
    UNIQUE INDEX `stock_opname_items_stockOpnameId_inventoryItemId_key`(`stockOpnameId`, `inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_opnames` ADD CONSTRAINT `stock_opnames_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_opname_items` ADD CONSTRAINT `stock_opname_items_stockOpnameId_fkey` FOREIGN KEY (`stockOpnameId`) REFERENCES `stock_opnames`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_opname_items` ADD CONSTRAINT `stock_opname_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

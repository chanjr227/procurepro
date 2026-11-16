-- AlterTable
ALTER TABLE `goods_receipts` ADD COLUMN `warehouseId` INTEGER NULL;

-- AlterTable
ALTER TABLE `purchase_order_items` ADD COLUMN `inventoryItemId` INTEGER NULL;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemCode` VARCHAR(50) NOT NULL,
    `itemName` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `unit` VARCHAR(50) NOT NULL,
    `minimumStock` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_items_itemCode_key`(`itemCode`),
    INDEX `inventory_items_itemName_idx`(`itemName`),
    INDEX `inventory_items_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouseCode` VARCHAR(50) NOT NULL,
    `warehouseName` VARCHAR(150) NOT NULL,
    `address` TEXT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouses_warehouseCode_key`(`warehouseCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryItemId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_stocks_warehouseId_idx`(`warehouseId`),
    UNIQUE INDEX `inventory_stocks_inventoryItemId_warehouseId_key`(`inventoryItemId`, `warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionNumber` VARCHAR(50) NOT NULL,
    `transactionType` ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `quantityChange` INTEGER NOT NULL,
    `stockBefore` INTEGER NOT NULL,
    `stockAfter` INTEGER NOT NULL,
    `referenceNumber` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `performedBy` VARCHAR(150) NULL,
    `goodsReceiptItemId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stock_transactions_transactionNumber_key`(`transactionNumber`),
    UNIQUE INDEX `stock_transactions_goodsReceiptItemId_key`(`goodsReceiptItemId`),
    INDEX `stock_transactions_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `stock_transactions_warehouseId_idx`(`warehouseId`),
    INDEX `stock_transactions_transactionType_idx`(`transactionType`),
    INDEX `stock_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_stocks` ADD CONSTRAINT `inventory_stocks_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_stocks` ADD CONSTRAINT `inventory_stocks_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_goodsReceiptItemId_fkey` FOREIGN KEY (`goodsReceiptItemId`) REFERENCES `goods_receipt_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

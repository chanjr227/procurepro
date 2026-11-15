-- CreateTable
CREATE TABLE `goods_receipts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receiptNumber` VARCHAR(50) NOT NULL,
    `purchaseOrderId` INTEGER NOT NULL,
    `receivedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedBy` VARCHAR(150) NULL,
    `notes` TEXT NULL,
    `status` ENUM('PARTIAL', 'COMPLETED') NOT NULL DEFAULT 'PARTIAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `goods_receipts_receiptNumber_key`(`receiptNumber`),
    INDEX `goods_receipts_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `goods_receipts_status_idx`(`status`),
    INDEX `goods_receipts_receivedDate_idx`(`receivedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_receipt_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goodsReceiptId` INTEGER NOT NULL,
    `purchaseOrderItemId` INTEGER NOT NULL,
    `quantityReceived` INTEGER NOT NULL DEFAULT 0,
    `quantityDamaged` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `goods_receipt_items_purchaseOrderItemId_idx`(`purchaseOrderItemId`),
    UNIQUE INDEX `goods_receipt_items_goodsReceiptId_purchaseOrderItemId_key`(`goodsReceiptId`, `purchaseOrderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_goodsReceiptId_fkey` FOREIGN KEY (`goodsReceiptId`) REFERENCES `goods_receipts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_purchaseOrderItemId_fkey` FOREIGN KEY (`purchaseOrderItemId`) REFERENCES `purchase_order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `healthIdEnabled` BOOLEAN NOT NULL DEFAULT false,
    `providerIdEnabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OwnHcode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hcode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OwnHcode_hcode_key`(`hcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminWhitelist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `addedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminWhitelist_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loginWay` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `hcode` VARCHAR(191) NULL,
    `tier` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `mac` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

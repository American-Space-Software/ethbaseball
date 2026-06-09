DROP TABLE IF EXISTS `team_market_offer`;

CREATE TABLE `team_market_offer` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `buyerUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `sellerUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `buyerPaymentTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `sellerPaymentTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `salePlayerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `diamondAmount` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,

  `expires` datetime DEFAULT NULL,
  `escrowTransactionId` varchar(255) DEFAULT NULL,
  `settlementTransactionId` varchar(255) DEFAULT NULL,

  `pendingSaleListingPlayerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
    GENERATED ALWAYS AS (
      CASE
        WHEN `buyerUserId` IS NULL
         AND `buyerPaymentTeamId` IS NULL
         AND `escrowTransactionId` IS NULL
         AND `status` = 'PENDING'
        THEN `salePlayerId`
        ELSE NULL
      END
    ) VIRTUAL,

  `pendingBuyOfferBuyerUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
    GENERATED ALWAYS AS (
      CASE
        WHEN `buyerUserId` IS NOT NULL
         AND `status` = 'PENDING'
        THEN `buyerUserId`
        ELSE NULL
      END
    ) VIRTUAL,

  `pendingBuyOfferPlayerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
    GENERATED ALWAYS AS (
      CASE
        WHEN `buyerUserId` IS NOT NULL
         AND `status` = 'PENDING'
        THEN `salePlayerId`
        ELSE NULL
      END
    ) VIRTUAL,

  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,

  PRIMARY KEY (`_id`),

  KEY `idx_tmo_buyer_user_id` (`buyerUserId`),
  KEY `idx_tmo_seller_user_id` (`sellerUserId`),
  KEY `idx_tmo_buyer_payment_team_id` (`buyerPaymentTeamId`),
  KEY `idx_tmo_seller_payment_team_id` (`sellerPaymentTeamId`),
  KEY `idx_tmo_sale_player_id` (`salePlayerId`),
  KEY `idx_tmo_status` (`status`),

  UNIQUE KEY `ux_pending_sale_listing` (`pendingSaleListingPlayerId`),
  UNIQUE KEY `ux_pending_buy_offer` (`pendingBuyOfferBuyerUserId`, `pendingBuyOfferPlayerId`),

  CONSTRAINT `fk_tmo_buyer_user`
    FOREIGN KEY (`buyerUserId`)
    REFERENCES `user` (`_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT `fk_tmo_seller_user`
    FOREIGN KEY (`sellerUserId`)
    REFERENCES `user` (`_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT `fk_tmo_buyer_payment_team`
    FOREIGN KEY (`buyerPaymentTeamId`)
    REFERENCES `team` (`_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT `fk_tmo_seller_payment_team`
    FOREIGN KEY (`sellerPaymentTeamId`)
    REFERENCES `team` (`_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT `fk_tmo_sale_player`
    FOREIGN KEY (`salePlayerId`)
    REFERENCES `player` (`_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;





SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;


ALTER TABLE `player`
ADD COLUMN `maxPitchCount` INT NOT NULL DEFAULT 0 AFTER `stamina`;

UPDATE `player`
SET `maxPitchCount` = 100
WHERE `primaryPosition` = 'PITCHER';




ALTER TABLE `user`
MODIFY COLUMN `discordRefreshToken` varchar(255) DEFAULT NULL,
MODIFY COLUMN `discordAccessToken` varchar(255) DEFAULT NULL,
MODIFY COLUMN `discordProfile` json DEFAULT NULL;

INSERT INTO `user` (
  `_id`,
  `address`,
  `discordId`,
  `discordRefreshToken`,
  `discordAccessToken`,
  `discordProfile`,
  `dateCreated`,
  `lastUpdated`
)
SELECT
  UUID(),
  '0x0000000000000000000000000000000000000000',
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM `user`
  WHERE `address` = '0x0000000000000000000000000000000000000000' COLLATE utf8mb4_unicode_ci
);

UPDATE `team` t
INNER JOIN `user` u
  ON u.`address` = '0x0000000000000000000000000000000000000000' COLLATE utf8mb4_unicode_ci
SET t.`userId` = u.`_id`
WHERE t.`userId` IS NULL;

ALTER TABLE `player_league_season`
ADD COLUMN `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL AFTER `teamId`;

UPDATE `player_league_season` pls
INNER JOIN `team` t ON t.`_id` = pls.`teamId`
SET pls.`userId` = t.`userId`
WHERE pls.`teamId` IS NOT NULL;

ALTER TABLE `player_league_season`
ADD KEY `userId` (`userId`),
ADD KEY `playerSeasonUser` (`seasonId`, `userId`, `playerId`, `seasonIndex`),
ADD CONSTRAINT `pls_ibfk_5` FOREIGN KEY (`userId`) REFERENCES `user` (`_id`) ON UPDATE CASCADE;




ALTER TABLE `game`
ADD COLUMN `substitutions` JSON DEFAULT NULL
AFTER `gameDate`;
DROP TABLE IF EXISTS `team_market_offer`;

CREATE TABLE `team_market_offer` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyerUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerUserId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyerPaymentTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerPaymentTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `package` json NOT NULL,
  `diamondAmount` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `expires` datetime DEFAULT NULL,
  `escrowTransactionId` varchar(255) DEFAULT NULL,
  `settlementTransactionId` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `buyerUserId` (`buyerUserId`),
  KEY `sellerUserId` (`sellerUserId`),
  KEY `buyerPaymentTeamId` (`buyerPaymentTeamId`),
  KEY `sellerPaymentTeamId` (`sellerPaymentTeamId`),
  KEY `status` (`status`),
  CONSTRAINT `team_market_offer_ibfk_1` FOREIGN KEY (`buyerUserId`) REFERENCES `user` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `team_market_offer_ibfk_2` FOREIGN KEY (`sellerUserId`) REFERENCES `user` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `team_market_offer_ibfk_3` FOREIGN KEY (`buyerPaymentTeamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `team_market_offer_ibfk_4` FOREIGN KEY (`sellerPaymentTeamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
DROP TABLE IF EXISTS `team_market_offer`;

CREATE TABLE `team_market_offer` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `buyerTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sellerTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `package` json NOT NULL,
  `diamondAmount` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `expires` datetime DEFAULT NULL,
  `escrowTransactionId` varchar(255) DEFAULT NULL,
  `settlementTransactionId` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `buyerTeamId` (`buyerTeamId`),
  KEY `sellerTeamId` (`sellerTeamId`),
  KEY `status` (`status`),
  CONSTRAINT `team_market_offer_ibfk_1` FOREIGN KEY (`buyerTeamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `team_market_offer_ibfk_2` FOREIGN KEY (`sellerTeamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
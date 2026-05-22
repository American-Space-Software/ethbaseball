DROP TABLE IF EXISTS `trade_request`;

CREATE TABLE `trade_request` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fromTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `toTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fromPackage` json NOT NULL,
  `toPackage` json NOT NULL,
  `status` varchar(255) NOT NULL,
  `expires` datetime DEFAULT NULL,
  `offChainEventTransactionId` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `fromTeamId` (`fromTeamId`),
  KEY `toTeamId` (`toTeamId`),
  KEY `status` (`status`),
  CONSTRAINT `trade_request_ibfk_1` FOREIGN KEY (`fromTeamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trade_request_ibfk_2` FOREIGN KEY (`toTeamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
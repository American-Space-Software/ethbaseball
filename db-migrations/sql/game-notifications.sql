
DROP TABLE IF EXISTS `game_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_notifications` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `gameId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `updatesSent` json DEFAULT NULL,
  `isComplete` tinyint(1) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,

  PRIMARY KEY (`_id`),
  UNIQUE KEY `uniq_game_notifications_game` (`gameId`),

  CONSTRAINT `game_notifications_ibfk_1`
    FOREIGN KEY (`gameId`)
    REFERENCES `game` (`_id`)
    ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- MySQL dump 10.13  Distrib 8.0.38, for Linux (x86_64)
--
-- Host: localhost    Database: ebldev
-- ------------------------------------------------------
-- Server version	8.4.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `animation`
--

DROP TABLE IF EXISTS `animation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `animation` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `content` text NOT NULL,
  `cid` varchar(255) NOT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `block`
--

DROP TABLE IF EXISTS `block`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `block` (
  `_id` varchar(255) NOT NULL,
  `hash` varchar(255) DEFAULT NULL,
  `parentHash` varchar(255) DEFAULT NULL,
  `number` bigint DEFAULT NULL,
  `ethUSDPrice` decimal(10,0) DEFAULT NULL,
  `timestamp` bigint DEFAULT NULL,
  `nonce` varchar(255) DEFAULT NULL,
  `difficulty` varchar(255) DEFAULT NULL,
  `gasLimit` json DEFAULT NULL,
  `gasUsed` json DEFAULT NULL,
  `miner` varchar(255) DEFAULT NULL,
  `extraData` varchar(255) DEFAULT NULL,
  `baseFeePerGas` json DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `city`
--

DROP TABLE IF EXISTS `city`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `population` int NOT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `city_pop` (`population`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `season`
--

DROP TABLE IF EXISTS `season`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date DEFAULT NULL,

  `isInitialized` tinyint(1) DEFAULT NULL,
  `isComplete` tinyint(1) DEFAULT NULL,

  `promotionRelegationLog` json DEFAULT NULL,

  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `connect_link`
--

DROP TABLE IF EXISTS `connect_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `connect_link` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `discordId` varchar(255) NOT NULL,
  `discordUsername` varchar(255) NOT NULL,
  `discordMessageId` varchar(255) DEFAULT NULL,
  `discordChannelId` varchar(255) DEFAULT NULL,
  `discordGuildId` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_state`
--

DROP TABLE IF EXISTS `contract_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_state` (
  `_id` varchar(255) NOT NULL,
  `indexRate` bigint DEFAULT NULL,
  `startBlock` bigint DEFAULT NULL,
  `lastIndexedBlock` bigint DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `discord_user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `discordId` varchar(255) DEFAULT NULL,
  `discordRefreshToken` varchar(255) DEFAULT NULL,
  `discordAccessToken` varchar(255) DEFAULT NULL,
  `discordProfile` json DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `discordId` (`discordId`),
  UNIQUE KEY `address` (`address`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `Session`
--

DROP TABLE IF EXISTS `Sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Sessions` (
  `sid` varchar(36) NOT NULL,
  `data` TEXT DEFAULT NULL,
  `expires` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `game`
--

DROP TABLE IF EXISTS `game`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `away` json DEFAULT NULL,
  `home` json DEFAULT NULL,
  `count` json DEFAULT NULL,
  `score` json DEFAULT NULL,
  `halfInnings` json DEFAULT NULL,
  `playIndex` int NOT NULL,
  `leagueAverages` json DEFAULT NULL,
  `summary` json DEFAULT NULL,
  `currentInning` int DEFAULT NULL,
  `isStarted` tinyint(1) DEFAULT NULL,
  `isTopInning` tinyint(1) DEFAULT NULL,
  `isComplete` tinyint(1) DEFAULT NULL,
  `isFinished` tinyint(1) DEFAULT NULL,
  `seasonId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leagueId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `stadiumId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `winningPitcherId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `losingPitcherId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `winningTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `losingTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `currentSimDate` datetime DEFAULT NULL,
  `startDate` datetime DEFAULT NULL,
  `gameDate` date DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `winningTeamId` (`winningTeamId`),
  KEY `losingTeamId` (`losingTeamId`),
  KEY `seasonId` (`seasonId`),
  KEY `leagueId` (`leagueId`),
  KEY `stadiumId` (`stadiumId`),
  KEY `game_date_created` (`dateCreated`),
  KEY `startDate` (`startDate`),
  KEY `gameDate` (`gameDate`),

  CONSTRAINT `game_ibfk_2` FOREIGN KEY (`winningTeamId`) REFERENCES `team` (`_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `game_ibfk_3` FOREIGN KEY (`losingTeamId`) REFERENCES `team` (`_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `game_ibfk_4` FOREIGN KEY (`stadiumId`) REFERENCES `stadium` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `game_ibfk_5` FOREIGN KEY (`leagueId`) REFERENCES `league` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `game_ibfk_6` FOREIGN KEY (`seasonId`) REFERENCES `season` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE



) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `game_team`
--

DROP TABLE IF EXISTS `game_team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_team` (
  `gameId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`gameId`,`teamId`),
  KEY `game_team_gameId` (`gameId`),
  KEY `game_team_teamId` (`teamId`),
  CONSTRAINT `game_team_ibfk_1` FOREIGN KEY (`gameId`) REFERENCES `game` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `game_team__ibfk_2` FOREIGN KEY (`teamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `game_player`
--

DROP TABLE IF EXISTS `game_player`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_player` (
  `gameId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `playerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`gameId`,`playerId`),
  KEY `game_player_gameId` (`gameId`),
  KEY `game_player_teamId` (`playerId`),
  CONSTRAINT `game_player_ibfk_1` FOREIGN KEY (`gameId`) REFERENCES `game` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `game_player__ibfk_2` FOREIGN KEY (`playerId`) REFERENCES `player` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `image`
--

DROP TABLE IF EXISTS `image`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `image` (
  `_id` varchar(255) NOT NULL,
  `svg` text DEFAULT NULL,
  `dataFull` LONGBLOB DEFAULT NULL,
  `data1024x1024` LONGBLOB DEFAULT NULL,
  `data100x100` LONGBLOB DEFAULT NULL,
  `data60x60` LONGBLOB DEFAULT NULL,
  `cid` varchar(255) NOT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `individual_game_queue`
--




--
-- Table structure for table `post`
--

DROP TABLE IF EXISTS `post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post` (
  `_id` varchar(255) NOT NULL,
  `title` TEXT NOT NULL,
  `short` JSON NOT NULL,
  `content` JSON NOT NULL,
  `isFeatured` tinyint(1) DEFAULT NULL,
  `publishDate` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `individual_game_queue`
--




--
-- Table structure for table `league`
--

DROP TABLE IF EXISTS `league`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `league` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `rank` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `averageRating` json DEFAULT NULL,
  `baseDiamondReward` varchar(100) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `rank` (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `owner`
--

DROP TABLE IF EXISTS `owner`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `owner` (
  `_id` varchar(255) NOT NULL,
  `count` bigint DEFAULT NULL,
  `diamondBalance` varchar(100) DEFAULT NULL,
  `diamondBalanceDecimal` decimal(50,18) DEFAULT NULL,

  `offChainDiamondBalance` varchar(100) DEFAULT NULL,
  `offChainDiamondBalanceDecimal` decimal(50,18) DEFAULT NULL,

  `transactionCount` bigint DEFAULT NULL,
  `tokenIds` json DEFAULT NULL,
  `lastActive` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY(`diamondBalanceDecimal`),
  KEY(`offChainDiamondBalanceDecimal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `owner`
--

DROP TABLE IF EXISTS `signature_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signature_token` (
  `_id` varchar(255) NOT NULL,
  `token` varchar(255) DEFAULT NULL,
  `expires` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `player`
--

DROP TABLE IF EXISTS `player`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `primaryPosition` varchar(255) NOT NULL,
  `tokenId` int NOT NULL AUTO_INCREMENT,
  `zodiacSign` varchar(255) NOT NULL,
  `personalityType` varchar(255) NOT NULL,
  `ownerId` varchar(255) DEFAULT NULL,
  `pitchingProfile` json NOT NULL,
  `hittingProfile` json NOT NULL,
  `throws` varchar(255) NOT NULL,
  `hits` varchar(255) NOT NULL,
  `isRetired` tinyint(1) NOT NULL,
  `careerStats` json DEFAULT NULL,
  `coverImageCid` varchar(255) DEFAULT NULL,
  `age` int NOT NULL,
  `stamina` decimal(10,2) NOT NULL,
  `overallRating` decimal(10,2) NOT NULL,
  `displayRating` decimal(10,2) NOT NULL,
  `pitchRatings` json NOT NULL,
  `hittingRatings` json NOT NULL,
  `percentileRatings` JSON NULL DEFAULT NULL,
  `lastGamePitched` datetime DEFAULT NULL,
  `lastGamePlayed` datetime DEFAULT NULL,
  `lastTeamChange` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `ownerId` (`ownerId`),
  KEY `tokenId` (`tokenId`),
  CONSTRAINT `player_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `owner` (`_id`) ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

ALTER TABLE `player` AUTO_INCREMENT=1;


--
-- Table structure for table `player_league_season`
--
DROP TABLE IF EXISTS `player_league_season`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_league_season` (

  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `playerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leagueId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `seasonId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `seasonIndex` int NOT NULL,
  `primaryPosition` varchar(255) NOT NULL,
  `age` int NOT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `overallRating` decimal(10,2) NOT NULL,
  `displayRating` decimal(10,2) NOT NULL,

  `pitchRatings` json NOT NULL,
  `hittingRatings` json NOT NULL,

  `percentileRatings` JSON NULL DEFAULT NULL,

  `stats` json NOT NULL,

  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,

  PRIMARY KEY (`_id`),

  KEY `displayRating` (`displayRating`),
  KEY `playerId` (`playerId`),
  KEY `leagueId` (`leagueId`),
  KEY `seasonId` (`seasonId`),
  KEY `teamId` (`teamId`),
  UNIQUE `seasonIndex` (`seasonId`, `playerId`, `seasonIndex`),
  KEY `playerSeasonTeam` (`seasonId`, `teamId`, `playerId`, `seasonIndex`),

  CONSTRAINT `pls_ibfk_1` FOREIGN KEY (`playerId`) REFERENCES `player` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `pls_ibfk_2` FOREIGN KEY (`leagueId`) REFERENCES `league` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `pls_ibfk_3` FOREIGN KEY (`seasonId`) REFERENCES `season` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `pls_ibfk_4` FOREIGN KEY (`teamId`) REFERENCES `team` (`_id`) ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



ALTER TABLE player_league_season

  ADD INDEX idx_cov_league_season_pos_team__overallRating
    (leagueId, seasonId, primaryPosition, teamId, overallRating),
  ADD INDEX idx_cov_league_season_pos_team__age
    (leagueId, seasonId, primaryPosition, teamId, age),

  ADD INDEX idx_sort_hit_ops
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.ops" AS DECIMAL(10,3)))),
  ADD INDEX idx_sort_hit_avg
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.avg" AS DECIMAL(10,3)))),
  ADD INDEX idx_sort_hit_obp
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.obp" AS DECIMAL(10,3)))),
  ADD INDEX idx_sort_hit_slg
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.slg" AS DECIMAL(10,3)))),
  ADD INDEX idx_sort_hit_homeRuns
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.homeRuns" AS SIGNED))),
  ADD INDEX idx_sort_hit_runs
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.runs" AS SIGNED))),
  ADD INDEX idx_sort_hit_hits
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.hits" AS SIGNED))),
  ADD INDEX idx_sort_hit_rbi
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.hitting.rbi" AS SIGNED))),

  /* PITCHING: core */
  ADD INDEX idx_sort_pit_era
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.pitching.era" AS DECIMAL(10,3)))),
  ADD INDEX idx_sort_pit_wpa
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.pitching.wpa" AS DECIMAL(10,3)))),
  ADD INDEX idx_sort_pit_so
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.pitching.so" AS SIGNED))),
  ADD INDEX idx_sort_pit_bb
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.pitching.bb" AS SIGNED))),
  ADD INDEX idx_sort_pit_wins
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.pitching.wins" AS SIGNED))),
  ADD INDEX idx_sort_pit_outs
    (seasonId, primaryPosition, teamId, (CAST(stats->>"$.pitching.outs" AS SIGNED)));














--
-- Table structure for table `processed_event`
--

DROP TABLE IF EXISTS `processed_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processed_event` (
  `_id` varchar(255) NOT NULL,
  `transactionIndex` bigint DEFAULT NULL,
  `blockNumber` bigint DEFAULT NULL,
  `processedTransactionId` varchar(255) NOT NULL,
  `offChainEventId` varchar(255) DEFAULT NULL,
  `logIndex` bigint DEFAULT NULL,
  `isMint` tinyint(1) DEFAULT NULL,
  `isBurn` tinyint(1) DEFAULT NULL,
  `isTransfer` tinyint(1) DEFAULT NULL,
  `namedArgs` json DEFAULT NULL,
  `amount` varchar(255) DEFAULT NULL,
  `data` text DEFAULT NULL,
  `topics` json DEFAULT NULL,
  `args` json DEFAULT NULL,
  `tokenId` bigint DEFAULT NULL,
  `contractAddress` varchar(255) DEFAULT NULL,
  `fromAddress` varchar(255) DEFAULT NULL,
  `toAddress` varchar(255) DEFAULT NULL,
  `event` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `processedTransactionId` (`processedTransactionId`),
  KEY `block-number-transaction-index-pe` (`transactionIndex`,`blockNumber`),
  CONSTRAINT `processed_event_ibfk_1` FOREIGN KEY (`processedTransactionId`) REFERENCES `processed_transaction` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `processed_event_ibfk_2` FOREIGN KEY (`offChainEventId`) REFERENCES `offchain_event` (`_id`) ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;






--
-- Table structure for table `offchain_event`
--

DROP TABLE IF EXISTS `offchain_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offchain_event` (

  `_id` varchar(255) NOT NULL,
  `transactionId` varchar(255) DEFAULT NULL,

  `playerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `amount` varchar(255) DEFAULT NULL,

  `contractType` varchar(255) DEFAULT NULL,

  `fromAddress` varchar(255) DEFAULT NULL,
  `toAddress` varchar(255) DEFAULT NULL,

  `fromTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `toTeamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,

  `event` varchar(255) DEFAULT NULL,

  `source` json DEFAULT NULL,

  `processedEventId` varchar(255) DEFAULT NULL,

  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE(`processedEventId`),
  CONSTRAINT `offchain_event_ibfk_1` FOREIGN KEY (`processedEventId`) REFERENCES `processed_event` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `offchain_event_ibfk_2` FOREIGN KEY (`playerId`) REFERENCES `player` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE



) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `processed_transaction`
--

DROP TABLE IF EXISTS `processed_transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processed_transaction` (
  `_id` varchar(255) NOT NULL,
  `_rev` varchar(255) DEFAULT NULL,
  `contractAddress` varchar(255) DEFAULT NULL,
  `blockNumber` bigint DEFAULT NULL,
  `transactionIndex` bigint DEFAULT NULL,
  `transactionFrom` varchar(255) DEFAULT NULL,
  `tokenTraderIds` json DEFAULT NULL,
  `diamondTraderIds` json DEFAULT NULL,
  `timestamp` bigint DEFAULT NULL,
  `tokenIds` json DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `block-number-transaction-index-pt` (`blockNumber`,`transactionIndex`),
  KEY `transactionFrom-pt` (`transactionFrom`),
  KEY `processed_transaction_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `processed_transaction_token`
--

DROP TABLE IF EXISTS `processed_transaction_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processed_transaction_token` (
  `processedTransactionId` varchar(255) NOT NULL,
  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`processedTransactionId`,`teamId`),
  KEY `processed_transaction_token_processed_transaction_id` (`processedTransactionId`),
  KEY `processed_transaction_token_teamId_id` (`teamId`),
  CONSTRAINT `processed_transaction_token_ibfk_1` FOREIGN KEY (`processedTransactionId`) REFERENCES `processed_transaction` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `processed_transaction_token_ibfk_2` FOREIGN KEY (`teamId`) REFERENCES `team` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `processed_transaction_trader`
--

DROP TABLE IF EXISTS `processed_transaction_trader`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processed_transaction_trader` (
  `processedTransactionId` varchar(255) NOT NULL,
  `ownerId` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`processedTransactionId`,`ownerId`),
  KEY `processed_transaction_trader_processed_transaction_id` (`processedTransactionId`),
  KEY `processed_transaction_trader_owner_id` (`ownerId`),
  CONSTRAINT `processed_transaction_trader_ibfk_1` FOREIGN KEY (`processedTransactionId`) REFERENCES `processed_transaction` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `processed_transaction_trader_ibfk_2` FOREIGN KEY (`ownerId`) REFERENCES `owner` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `seed`
--

DROP TABLE IF EXISTS `seed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seed` (
  `_id` varchar(255) NOT NULL,
  `seed` int NOT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stadium`
--

DROP TABLE IF EXISTS `stadium`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stadium` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ownerId` varchar(255) DEFAULT NULL,
  `capacity` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `abbrev` varchar(36) DEFAULT NULL,
  `mintKey` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,

  `longTermRating` json NOT NULL,
  `seasonRating` json NOT NULL,

  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `colors` json NOT NULL,

  `lastGamePlayed` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;





--
-- Table structure for table `team_league_season`
--
DROP TABLE IF EXISTS `team_league_season`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_league_season` (

  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leagueId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `seasonId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  
  `stadiumId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `cityId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `logoId` varchar(255) DEFAULT NULL,

  `longTermRating` json NOT NULL,
  `seasonRating` json NOT NULL,  
  
  `financeSeason` json NOT NULL,   
  `overallRecord` json NOT NULL,

  `hasValidLineup` tinyint(1) DEFAULT NULL,

  `lineups` json DEFAULT NULL,

  `fanInterestShortTerm` decimal(10,5) DEFAULT NULL,
  `fanInterestLongTerm` decimal(10,5) DEFAULT NULL,

  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,

  PRIMARY KEY (`_id`),
  UNIQUE KEY `tls` (`teamId`,`leagueId`,`seasonId`),

  KEY `teamId` (`teamId`),
  KEY `leagueId` (`leagueId`),
  KEY `seasonId` (`seasonId`),

  KEY `cityId` (`cityId`),
  
  CONSTRAINT `tls_ibfk_1` FOREIGN KEY (`cityId`) REFERENCES `city` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `tls_ibfk_2` FOREIGN KEY (`stadiumId`) REFERENCES `stadium` (`_id`) ON UPDATE CASCADE,

  CONSTRAINT `tls_ibfk_3` FOREIGN KEY (`teamId`) REFERENCES `team` (`_id`)  ON UPDATE CASCADE,
  CONSTRAINT `tls_ibfk_4` FOREIGN KEY (`leagueId`) REFERENCES `league` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `tls_ibfk_5` FOREIGN KEY (`seasonId`) REFERENCES `season` (`_id`) ON UPDATE CASCADE,
  CONSTRAINT `tls_ibfk_6` FOREIGN KEY (`logoId`) REFERENCES `image` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction` (
  `_id` varchar(255) NOT NULL,
  `_rev` varchar(255) DEFAULT NULL,
  `hash` varchar(255) DEFAULT NULL,
  `blockHash` varchar(255) DEFAULT NULL,
  `blockNumber` bigint DEFAULT NULL,
  `transactionIndex` bigint DEFAULT NULL,
  `data` text,
  `from` varchar(255) DEFAULT NULL,
  `gasLimit` json DEFAULT NULL,
  `gasPrice` json DEFAULT NULL,
  `nonce` bigint DEFAULT NULL,
  `value` json DEFAULT NULL,
  `networkId` bigint DEFAULT NULL,
  `r` text,
  `s` text,
  `v` bigint DEFAULT NULL,
  `raw` text,
  `receipt` json DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `block-number-transaction-index` (`blockNumber`,`transactionIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `universe`
--

DROP TABLE IF EXISTS `universe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `universe` (
  `_id` varchar(255) NOT NULL,
  `diamondAddress` varchar(255) DEFAULT NULL,
  `adminAddress` varchar(255) NOT NULL,
  `minterAddress` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `ipfsCid` varchar(255) DEFAULT NULL,
  `descriptionMarkdown` varchar(255) DEFAULT NULL,
  `coverImageId` varchar(255) DEFAULT NULL,
  `currentDate` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;





--
-- Table structure for table `diamond_mint_pass`
--

DROP TABLE IF EXISTS `diamond_mint_pass`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diamond_mint_pass` (
  `_id` varchar(255) NOT NULL,
  `toUserId` varchar(255) NOT NULL,
  `toAddress` varchar(255) NOT NULL,
  `amount` varchar(255) NOT NULL,
  `expires` int DEFAULT NULL,
  `r` varchar(255) DEFAULT NULL,
  `s` varchar(255) DEFAULT NULL,
  `v` bigint DEFAULT NULL,
  `processedTransactionId` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`),
  CONSTRAINT `diamond_mint_pass_ibfk_1` FOREIGN KEY (`processedTransactionId`) REFERENCES `processed_transaction` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `diamond_mint_pass`
--

DROP TABLE IF EXISTS `team_mint_pass`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_mint_pass` (
  `_id` varchar(255) NOT NULL,
  `to` varchar(255) NOT NULL,
  `tokenId` int DEFAULT NULL,
  `totalDiamonds` varchar(255) DEFAULT NULL,
  `ethCost` varchar(255) DEFAULT NULL,
  `expires` int DEFAULT NULL,
  `r` varchar(255) DEFAULT NULL,
  `s` varchar(255) DEFAULT NULL,
  `v` bigint DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `game_hit_result`
--

DROP TABLE IF EXISTS `game_hit_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_hit_result` (
  `gameId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `playerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `age` int NOT NULL,
  `teamWins` int NOT NULL,
  `teamLosses` int NOT NULL,
  `pa` int NOT NULL,
  `atBats` int NOT NULL,
  `hits` int NOT NULL,
  `singles` int NOT NULL,
  `doubles` int NOT NULL,
  `triples` int NOT NULL,
  `homeRuns` int NOT NULL,
  `runs` int NOT NULL,
  `rbi` int NOT NULL,
  `bb` int NOT NULL,
  `sbAttempts` int NOT NULL,
  `sb` int NOT NULL,
  `cs` int NOT NULL,
  `hbp` int NOT NULL,
  `so` int NOT NULL,
  `lob` int NOT NULL,
  `sacBunts` int NOT NULL,
  `sacFlys` int NOT NULL,
  `groundOuts` int NOT NULL,
  `flyOuts` int NOT NULL,
  `lineOuts` int NOT NULL,
  `outs` int NOT NULL,
  `groundBalls` int NOT NULL,
  `lineDrives` int NOT NULL,
  `flyBalls` int NOT NULL,
  `gidp` int NOT NULL,
  `po` int NOT NULL,
  `assists` int NOT NULL,
  `outfieldAssists` int NOT NULL,
  `csDefense` int NOT NULL,
  `doublePlays` int NOT NULL,
  `e` int NOT NULL,
  `passedBalls` int NOT NULL,
  `wpa` decimal(10,5) DEFAULT NULL,
  `pitches` int NOT NULL,
  `balls` int NOT NULL,
  `strikes` int NOT NULL,
  `fouls` int NOT NULL,
  `inZone` int NOT NULL,
  `swings` int NOT NULL,
  `swingAtBalls` int NOT NULL,
  `swingAtStrikes` int NOT NULL,
  `ballsInPlay` int NOT NULL,
  `inZoneContact` int NOT NULL,
  `outZoneContact` int NOT NULL,
  `totalPitchQuality` int NOT NULL,
  `totalPitchPowerQuality` int NOT NULL,
  `totalPitchLocationQuality` int NOT NULL,
  `totalPitchMovementQuality` int NOT NULL,
  `overallRatingBefore` decimal(10,2) DEFAULT NULL,
  `overallRatingAfter` decimal(10,2) DEFAULT NULL,
  `careerStats` json DEFAULT NULL,
  `startDate` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`gameId`,`playerId`),
  KEY `playerId` (`playerId`),
  KEY `startDate` (`startDate`),
  KEY (`playerId`, `startDate`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_pitch_result`
--

DROP TABLE IF EXISTS `game_pitch_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_pitch_result` (
  `gameId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `playerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `age` int NOT NULL,
  `teamWins` int NOT NULL,
  `teamLosses` int NOT NULL,
  `starts` int NOT NULL,
  `wins` int NOT NULL,
  `losses` int NOT NULL,
  `saves` int NOT NULL,
  `bs` int NOT NULL,
  `outs` int NOT NULL,
  `er` int NOT NULL,
  `so` int NOT NULL,
  `hits` int NOT NULL,
  `bb` int NOT NULL,
  `sho` int NOT NULL,
  `cg` int NOT NULL,
  `hbp` int NOT NULL,
  `singles` int NOT NULL,
  `doubles` int NOT NULL,
  `triples` int NOT NULL,
  `battersFaced` int NOT NULL,
  `atBats` int NOT NULL,
  `runs` int NOT NULL,
  `homeRuns` int NOT NULL,
  `groundOuts` int NOT NULL,
  `flyOuts` int NOT NULL,
  `lineOuts` int NOT NULL,
  `groundBalls` int NOT NULL,
  `lineDrives` int NOT NULL,
  `flyBalls` int NOT NULL,
  `sacFlys` int NOT NULL,
  `wpa` decimal(10,5) DEFAULT NULL,
  `wildPitches` int NOT NULL,
  `pitches` int NOT NULL,
  `strikes` int NOT NULL,
  `balls` int NOT NULL,
  `fouls` int NOT NULL,
  `inZone` int NOT NULL,
  `swings` int NOT NULL,
  `swingAtBalls` int NOT NULL,
  `swingAtStrikes` int NOT NULL,
  `ballsInPlay` int NOT NULL,
  `inZoneContact` int NOT NULL,
  `outZoneContact` int NOT NULL,
  `totalPitchQuality` int NOT NULL,
  `totalPitchPowerQuality` int NOT NULL,
  `totalPitchLocationQuality` int NOT NULL,
  `totalPitchMovementQuality` int NOT NULL,
  `overallRatingBefore` decimal(10,2) DEFAULT NULL,
  `overallRatingAfter` decimal(10,2) DEFAULT NULL,
  `careerStats` json DEFAULT NULL,
  `startDate` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`gameId`,`playerId`),
  KEY `playerId` (`playerId`),
    KEY `startDate` (`startDate`),
  KEY (`playerId`, `startDate`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `team_queue`
--

DROP TABLE IF EXISTS `team_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_queue` (
  `_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `teamId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `leagueId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `teamRating` decimal(10,2) NOT NULL,
  `maxRatingDiff` INT NOT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `dateCreated` datetime DEFAULT NULL,

  PRIMARY KEY (`_id`),
  UNIQUE KEY `uniq_team_queue_team` (`teamId`),

  CONSTRAINT `team_queue_ibfk_1`
    FOREIGN KEY (`teamId`)
    REFERENCES `team` (`_id`)
    ON DELETE CASCADE,

  CONSTRAINT `team_queue_ibfk_2`
    FOREIGN KEY (`leagueId`)
    REFERENCES `league` (`_id`)
    ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



-- Dump completed on 2024-10-01 18:44:33
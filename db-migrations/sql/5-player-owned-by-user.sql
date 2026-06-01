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

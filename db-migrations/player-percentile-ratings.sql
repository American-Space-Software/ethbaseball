ALTER TABLE `player` 
ADD COLUMN `percentileRatings` JSON NULL DEFAULT NULL AFTER `hittingRatings`;



ALTER TABLE `player_league_season` 
ADD COLUMN `percentileRatings` JSON NULL DEFAULT NULL AFTER `hittingRatings`;


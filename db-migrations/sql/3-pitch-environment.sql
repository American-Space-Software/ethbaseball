ALTER TABLE `game` 
CHANGE COLUMN `leagueAverages` `pitchEnvironmentTarget` JSON NULL DEFAULT NULL ;

ALTER TABLE `league` 
ADD COLUMN `pitchEnvironmentTarget` JSON NULL DEFAULT NULL AFTER `baseDiamondReward`;

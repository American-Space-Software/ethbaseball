import { inject, injectable } from "inversify"

import { PlayerRepository } from "../../repository/player-repository.js"
import { Player } from "../../dto/player.js"

import { faker } from '@faker-js/faker'
import { RollService } from "../roll-service.js"
import { Owner } from "../../dto/owner.js"
import { SeedService } from "./seed-service.js"
import { Image } from "../../dto/image.js"

import { ContactTypeRollInput, PowerRollInput } from "../../dto/roll-input.js"

import glicko2 from "glicko2"

import { Animation } from "../../dto/animation.js"

import { ImageService } from "./image-service.js"
import { StatService } from "../stat-service.js"
import {  Handedness, Position, Rating, PitchingHandednessRatings, HittingHandednessRatings, BallSwingByCount, FielderChance, HittingRatings, InZoneByCount, LeagueAverage, PitchRatings, ShallowDeepChance, StrikeSwingByCount, PitchType, HitResultCount, PitchResultCount, PlayerStatLines, LeagueAverageRatings, PlayerFinalContract,  PersonalityType, PlayerPercentileRatings, TeamSeasonId, HitterPitcher, FREE_AGENT_DAYS_TO_FLOOR, STARTING_FREE_AGENT_PRICE, FREE_AGENT_FLOOR_PRICE, PLAYER_LEAGUE_AVERAGE_RATING, PlayerGrade, HITTER_GAME_AVERAGE_XP } from "../enums.js"


import zodiacFn from 'zodiac-signs'
import { League } from "../../dto/league.js"
import { ethers } from "ethers"
import { Season } from "../../dto/season.js"
import { PlayerLeagueSeasonService } from "./player-league-season-service.js"
import { PlayerLeagueSeason } from "../../dto/player-league-season.js"
import { SeasonService } from "./season-service.js"
import { TeamLeagueSeason } from "../../dto/team-league-season.js"
import { TeamLeagueSeasonService } from "./team-league-season-service.js"
import dayjs from "dayjs"
import { PlayerSharedService } from "../shared/player-shared-service.js"


const zodiac = zodiacFn("en")

// const parser = new DOMParser()

const GLICKO_SETTINGS = {
    // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
    //      be tested to decide which value results in greatest predictive accuracy."
    tau: 0.5,
    // rating : default rating
    rating: 1500,
    //rd : Default rating deviation 
    //     small number = good confidence on the rating accuracy
    rd: 25,
    //vol : Default volatility (expected fluctation on the player rating)
    vol: 0.06
}

const MAX_RATING = 2500
const PLAYER_RETIREMENT_AGE = 41


@injectable()
class PlayerService {

    @inject("PlayerRepository")
    private playerRepository: PlayerRepository

    constructor(
        private rollService: RollService,
        private seedService: SeedService,
        private imageService: ImageService,
        private statService: StatService,
        private seasonService:SeasonService,
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,
        private playerSharedService:PlayerSharedService
    ) { }



    async get(_id: string, options?: any) {
        return this.playerRepository.get(_id, options)
    }

    async getWithTeam(_id: string, options?: any) {
        return this.playerRepository.getWithTeam(_id, options)
    }

    async getWithTeamByIds(_ids: string[], options?: any) {
        return this.playerRepository.getWithTeamByIds(_ids, options)
    }

    async getFreeAgentsAfterSeason(season:Season, options?:any) : Promise<PlayerFinalContract[]> {
        return this.playerRepository.getFreeAgentsAfterSeason(season, options)
    }

    async put(player: Player, options?: any) {
        return this.playerRepository.put(player, options)
    }

    async delete(player: Player, options?:any) {
        return this.playerRepository.delete(player, options)
    }

    /**
     * @param ercEvents 
     * @returns 
     */
    async putAll(players: Player[], options?: any) {
        return this.playerRepository.putAll(players, options)
    }

    async getByTokenId(tokenId: number, options?: any) {
        return this.playerRepository.getByTokenId(tokenId, options)
    }

    async getByTokenIdWithTeam(tokenId: number, options?: any) {
        return this.playerRepository.getByTokenIdWithTeam(tokenId, options)
    }

    async getByIds(ids: string[], options?: any) {
        return this.playerRepository.getByIds(ids, options)
    }

    async getByTokenIds(tokenIds: number[], options?: any) {
        return this.playerRepository.getByTokenIds(tokenIds, options)
    }

    async getUpdatedLastGameSince(lastUpdated: Date, options?: any): Promise<Player[]> {
        return this.playerRepository.getUpdatedLastGameSince(lastUpdated, options)
    }

    async getIds(options?: any): Promise<string[]> {
        return this.playerRepository.getIds(options)
    }

    // async getLeagueAverageHitterRatings(league:League, season:Season, options?:any) : Promise<HittingRatings>  {
    //     return this.playerRepository.getLeagueAverageHitterRatings(league, season, options)
    // }

    // async getLeagueAveragePitcherRatings(league:League,season:Season, options?:any) : Promise<PitchRatings>  {
    //     return this.playerRepository.getLeagueAveragePitcherRatings(league, season, options)
    // }

    async getPlayerPercentileRatings(options?:any) : Promise<PlayerPercentileRatings[]> {
        return this.playerRepository.getPlayerPercentileRatings(options)
    }
    
    async scoutPlayer(command: ScoutPlayerCommand) {

        let rng = await this.seedService.getRNG()

        let fakerSeed = rng()

        //Set faker seed.
        faker.seed(fakerSeed * 1000000000)

        let player: Player = new Player()

        //Random position
        player.primaryPosition = command.type

        //Generate a name.
        player.firstName = faker.person.firstName()
        player.lastName = faker.person.lastName()


        let sign = zodiac.getSignByDate()

        player.zodiacSign = sign.name
        player.personalityType = this.randomPersonalityType(rng)

        player.throws = faker.helpers.weightedArrayElement([{ weight: 80, value: Handedness.R }, { weight: 20, value: Handedness.L }])
        player.hits = faker.helpers.weightedArrayElement([{ weight: 70, value: Handedness.R }, { weight: 20, value: Handedness.L }, { weight: 10, value: Handedness.S }])

        player.potentialOverallRating = 70
        player.age = 19
        player.stamina = 1

        player.isRetired = false

        player.hittingProfile = await this.rollService.generateHittingProfile()
        player.pitchingProfile = await this.rollService.generatePitchingProfile(player.primaryPosition == Position.PITCHER)

        //Calculate ratings
        
        this.updateHittingPitchingRatings( player)

        let image: Image = await this.imageService.generateImage(player)
        player.coverImageCid = image.cid

        

        player.careerStats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }
        
        return player
    }



    async scoutTeam(date:string) {

        let positions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD,
            Position.PITCHER,
            Position.PITCHER,
            Position.PITCHER,
            Position.PITCHER,
            Position.PITCHER
        ]

        let scoutedPlayers: Player[] = []

        for (let position of positions) {
            scoutedPlayers.push(await this.scoutPlayer({ type: position, onDate: date }))
        }

        return scoutedPlayers

    }

    async draftPlayer(tokenId: number, position: Position, transactionHash: string, date:string) {

        let scoutedPlayer: Player = await this.scoutPlayer({ type: position, onDate: date })

        scoutedPlayer.transactionHash = transactionHash
        scoutedPlayer.tokenId = tokenId

        return scoutedPlayer

    }

    async draftTeam(startTokenId: number, transactionHash: string, date:string) : Promise<Player[]> {

        let scoutedPlayers: Player[] = await this.scoutTeam(date)

        let nextTokenId = startTokenId

        for (let player of scoutedPlayers) {

            player.transactionHash = transactionHash
            player.tokenId = nextTokenId

            nextTokenId++
        }


        return scoutedPlayers

    }

    calculateHittingRatings(player: Player, overallRating:number): HittingRatings {

        let hittingRatings: HittingRatings = {}


        //Contact profile gets copied over
        hittingRatings.contactProfile = player.hittingProfile.contactProfile


        //Adjust for age
        overallRating *= this.getAgeModifier(player.age)

        //Slash ratings if this is a pitcher
        if (player.primaryPosition == Position.PITCHER) {
            overallRating *= .25
        }

        //Adjust based on player's profile
        const ratings = [
            overallRating + (100 * player.hittingProfile.speedDelta),
            overallRating + (100 * player.hittingProfile.stealsDelta),
            overallRating + (100 * player.hittingProfile.defenseDelta),
            overallRating + (100 * player.hittingProfile.armDelta),
            overallRating + (100 * player.hittingProfile.contactDelta),
            overallRating + (100 * player.hittingProfile.gapPowerDelta),
            overallRating + (100 * player.hittingProfile.homerunPowerDelta),
            overallRating + (100 * player.hittingProfile.plateDisciplineDelta)
        ]


        hittingRatings.speed = ratings[0]
        hittingRatings.steals = ratings[1]
        hittingRatings.defense = ratings[2]
        hittingRatings.arm = ratings[3]

        let vsOppositeHand: HittingHandednessRatings = {
            contact: ratings[4],
            gapPower: ratings[5],
            homerunPower: ratings[6],
            plateDiscipline: ratings[7]
        }

        let vsSameHand = JSON.parse(JSON.stringify(vsOppositeHand))
        this.modifyHandednessRatings(vsSameHand, -Math.abs(player.hittingProfile.vsSameHandDelta))

        if (player.hits == Handedness.R) {
            hittingRatings.vsR = vsSameHand
            hittingRatings.vsL = vsOppositeHand
        } else if (player.hits == Handedness.L) {
            hittingRatings.vsL = vsSameHand
            hittingRatings.vsR = vsOppositeHand
        } else {
            hittingRatings.vsL = vsSameHand
            hittingRatings.vsR = JSON.parse(JSON.stringify(vsOppositeHand))
        }


        //Round the ratings
        this.roundRatings(hittingRatings)

        return hittingRatings
    }

    calculatePitchRatings(player: Player, overallRating:number): PitchRatings {

        let pitchRatings: PitchRatings = {
            pitches: player.pitchingProfile.pitches
        }

        //Contact profile gets copied over
        pitchRatings.contactProfile = player.pitchingProfile.contactProfile

        //Adjust for age
        overallRating *= this.getAgeModifier(player.age)

        //Slash ratings if this is a pitcher
        if (player.primaryPosition != Position.PITCHER) {
            overallRating *= .25
        }

        //Adjust based on player's profile
        let ratings = [
            overallRating + (100 * player.pitchingProfile.powerDelta),
            overallRating + (100 * player.pitchingProfile.controlDelta),
            overallRating + (100 * player.pitchingProfile.movementDelta)
        ]

        pitchRatings.power = ratings[0]

        let vsOppositeHand: PitchingHandednessRatings = {
            control: ratings[1],
            movement: ratings[2],
        }

        // let i = 3
        // for (let pitch of player.pitchingProfile.pitches) {

        //     pitchRatings.pitches.push({
        //         rating: normalizedRatings[i],
        //         type: pitch.type
        //     })

        //     i++
        // }

        let vsSameHand = JSON.parse(JSON.stringify(vsOppositeHand))
        this.modifyHandednessRatings(vsSameHand, -Math.abs(player.pitchingProfile.vsSameHandDelta))


        if (player.throws == Handedness.R) {
            pitchRatings.vsR = vsSameHand
            pitchRatings.vsL = vsOppositeHand
        } else {
            pitchRatings.vsL = vsSameHand
            pitchRatings.vsR = vsOppositeHand
        }

        this.roundRatings(pitchRatings)

        return pitchRatings
    }

    getAverageHittingRating(hittingRatings:HittingRatings) {
        return (hittingRatings.arm + hittingRatings.defense + hittingRatings.speed + 
        hittingRatings.steals + hittingRatings.vsL.contact + hittingRatings.vsL.gapPower + hittingRatings.vsL.homerunPower + hittingRatings.vsL.plateDiscipline +
        hittingRatings.vsR.contact + hittingRatings.vsR.gapPower + hittingRatings.vsR.homerunPower + hittingRatings.vsR.plateDiscipline) / 12 
    }

    getAveragePitchingRating(pitchRatings:PitchRatings) {

        return (pitchRatings.power + pitchRatings.vsL.control + pitchRatings.vsL.movement + pitchRatings.vsR.control + pitchRatings.vsR.movement ) / 5
    
    }



    // normalizeRatings(numbers: number[], max: number): number[] {

    //     const ratio = Math.max(...numbers) / max
    //     return numbers.map(v => Math.round(v / ratio))

    // }



    getAgeModifier(yearsOld: number): number {
        return this.playerSharedService.getAgeModifier(yearsOld)
    }

    getAgeLearningModifier(yearsOld: number): number {
        return this.playerSharedService.getAgeLearningModifier(yearsOld)
    }

    getRatingModifier(rating: number): number {
        if (rating > MAX_RATING) rating = MAX_RATING
        return 1 + this.rollService.getChange(1500, rating)
    }

    async getByOwner(owner: Owner, options?: any): Promise<Player[]> {
        return this.playerRepository.getByOwner(owner, options)
    }

    async countByOwner(owner: Owner, options?: any): Promise<number> {
        return this.playerRepository.countByOwner(owner, options)
    }

    async count(options?: any): Promise<number> {
        return this.playerRepository.count(options)
    }

    async countActive(options?:any): Promise<number> {
        return this.playerRepository.countActive(options)
    }

    calculateRating(players: RatingPlayer[]): Rating {

        if (players.length == 0) return

        return {
            rating: players.reduce((total, next) => total + next.rating.rating, 0) / players.length,
            ratingDeviation: players.reduce((total, next) => total + next.rating.ratingDeviation, 0) / players.length,
            volatility: players.reduce((total, next) => total + next.rating.volatility, 0) / players.length
        }

    }

    buildLeagueAverages(): LeagueAverage {

        let la: LeagueAverage = {

            hittingRatings: {
                speed: PLAYER_LEAGUE_AVERAGE_RATING,
                steals: PLAYER_LEAGUE_AVERAGE_RATING,
                arm: PLAYER_LEAGUE_AVERAGE_RATING,
                defense: PLAYER_LEAGUE_AVERAGE_RATING,
                vsL: {
                    contact: PLAYER_LEAGUE_AVERAGE_RATING,
                    gapPower: PLAYER_LEAGUE_AVERAGE_RATING,
                    homerunPower: PLAYER_LEAGUE_AVERAGE_RATING,
                    plateDiscipline: PLAYER_LEAGUE_AVERAGE_RATING
                },
                vsR: {
                    contact: PLAYER_LEAGUE_AVERAGE_RATING,
                    gapPower: PLAYER_LEAGUE_AVERAGE_RATING,
                    homerunPower: PLAYER_LEAGUE_AVERAGE_RATING,
                    plateDiscipline: PLAYER_LEAGUE_AVERAGE_RATING
                }
            },

            pitchRatings: {
                power: PLAYER_LEAGUE_AVERAGE_RATING,
                vsL: {
                    control: PLAYER_LEAGUE_AVERAGE_RATING,
                    movement: PLAYER_LEAGUE_AVERAGE_RATING
                },
                vsR: {
                    control: PLAYER_LEAGUE_AVERAGE_RATING,
                    movement: PLAYER_LEAGUE_AVERAGE_RATING
                }
            },

            foulRate: LEAGUE_AVERAGE_FOUL_RATE,

            inZoneRate: LEAGUE_AVERAGE_IN_ZONE_RATE,
            strikeSwingRate: LEAGUE_AVERAGE_STRIKE_SWING_RATE,
            ballSwingRate: LEAGUE_AVERAGE_BALL_SWING_RATE,

            zoneSwingContactRate: LEAGUE_AVERAGE_ZONE_SWING_CONTACT_RATE,
            chaseSwingContactRate: LEAGUE_AVERAGE_CHASE_SWING_CONTACT_RATE,

            fielderChanceR: LEAGUE_AVERAGE_FIELDER_CHANCE_R,
            fielderChanceL: LEAGUE_AVERAGE_FIELDER_CHANCE_L,
            shallowDeepChance: LEAGUE_AVERAGE_SHALLOW_DEEP_CHANCE,

            pitchQuality: LEAGUE_AVERAGE_PITCH_QUALITY,

            powerRollInput: LEAGUE_AVERAGE_POWER_ROLL_INPUT,
            contactTypeRollInput: LEAGUE_AVERAGE_CONTACT_TYPE_INPUT
        }

        return la

    }

    modifyRatings(ratings: HittingRatings | PitchRatings, modifier: number) {

        let keys = Object.keys(ratings).filter(k => k != "contactProfile")

        for (let key of keys) {

            if (!Array.isArray(ratings[key])) {

                if (Object.keys(ratings[key]).length > 0) {

                    for (let k of Object.keys(ratings[key])) {
                        ratings[key][k] *= modifier
                    }

                } else {
                    ratings[key] *= modifier
                }

            } 

        }

    }

    modifyHandednessRatings(ratings: HittingHandednessRatings | PitchingHandednessRatings, delta: number) {

        for (let key of Object.keys(ratings)) {
            ratings[key] += ratings[key] * delta
        }
    }

    roundRatings(ratings: HittingRatings | PitchRatings) {

        for (let key of Object.keys(ratings)) {

            if (!Array.isArray(ratings[key])) {

                if (Object.keys(ratings[key]).length > 0) {

                    for (let k of Object.keys(ratings[key])) {
                        ratings[key][k] = Math.round(ratings[key][k])
                        if (ratings[key][k] == 0) ratings[key][k] = 1
                    }

                } else {
                    // ratings[key] *=  modifier
                    ratings[key] = Math.round(ratings[key])
                    if (ratings[key] == 0) ratings[key] = 1
                }

            } else {

                // //If it's an array (pitches) loop through updating rating
                // for (let pitchRating of ratings[key]) {
                //     pitchRating.rating = Math.round(pitchRating.rating)

                //     if (pitchRating.rating == 0) pitchRating.rating = 1


                // }

            }

        }

    }

    modifyRatingsPercent(ratings: HittingRatings | PitchRatings, percentModifier: number) {

        for (let key of Object.keys(ratings)) {

            if (!Array.isArray(ratings[key])) {
                ratings[key] += (ratings[key] * percentModifier)

            } else {

                //If it's an array (pitches) loop through updating rating
                for (let pitchRating of ratings[key]) {
                    pitchRating.rating += (pitchRating.rating * percentModifier)
                }

            }

        }

    }

    updateRatings(winningPlayers: RatingPlayer[], losingPlayers: RatingPlayer[]): RatingPlayer[] {

        let ranking = new glicko2.Glicko2(GLICKO_SETTINGS)

        let loserRating = this.calculateRating(losingPlayers)
        let winnerRating = this.calculateRating(winningPlayers)

        const idMap = {}
        const matches = []

        //Each winner plays a game against a player that has the average ratings of all the opponents.
        for (let player of winningPlayers) {

            const p = ranking.makePlayer(player.rating.rating, player.rating.ratingDeviation, player.rating.volatility)

            idMap[p.id] = player._id

            matches.push([
                p,
                ranking.makePlayer(loserRating.rating, loserRating.ratingDeviation, loserRating.volatility),
                1
            ])

        }

        //Each loser does the same.
        for (let player of losingPlayers) {

            const p = ranking.makePlayer(player.rating.rating, player.rating.ratingDeviation, player.rating.volatility)

            idMap[p.id] = player._id

            matches.push([
                p,
                ranking.makePlayer(winnerRating.rating, winnerRating.ratingDeviation, winnerRating.volatility),
                0]
            )

        }

        ranking.updateRatings(matches)

        let allPlayers: RatingPlayer[] = [].concat(winningPlayers).concat(losingPlayers)

        let ratingPlayers: RatingPlayer[] = []

        for (let rankPlayer of ranking.getPlayers()) {

            if (idMap[rankPlayer.id]) {

                let player = allPlayers.find(p => p._id == idMap[rankPlayer.id])

                ratingPlayers.push({
                    _id: player._id,
                    rating: { rating: rankPlayer.getRating(), ratingDeviation: rankPlayer.getRd(), volatility: rankPlayer.getVol() }
                })

            }

        }

        return ratingPlayers

    }

    updateHittingPitchingRatings(player: Player) {

        //Calculate actual ratings
        player.overallRating = player.potentialOverallRating * this.getAgeModifier(player.age)
        player.hittingRatings = this.calculateHittingRatings( player, player.overallRating)
        player.pitchRatings = this.calculatePitchRatings( player, player.overallRating)

        //Calculate potential ratings
        player.potentialHittingRatings = this.calculateHittingRatings(player, player.potentialOverallRating)
        player.potentialPitchRatings = this.calculatePitchRatings(player, player.potentialOverallRating)

    }



    async getPlayerReport(options?: any) {
        return this.playerRepository.getPlayerReport(options)
    }

    async updateGameFields(players: Player[], options?: any) {
        return this.playerRepository.updateGameFields(players, options)
    }

    async getMaxTokenId(options?: any): Promise<number> {
        return this.playerRepository.getMaxTokenId(options)
    }

    createNFTMetadata(player: Player, coverImage: Image, animation: Animation) {

        let result: NFTMetadata = {
            tokenId: player.tokenId,
            name: player.fullName,
            description: '',

        }

        result.animation_url = `ipfs://${animation.cid}`
        result.image = `ipfs://${coverImage.cid}`

        result.attributes = [
            {
                trait_type: "ID",
                value: player._id.toString()
            },
            {
                trait_type: "Name",
                value: player.fullName
            },
            {
                trait_type: "Age",
                value: player.age.toString()
            },
            {
                trait_type: "Zodiac",
                value: player.zodiacSign
            },
            {
                trait_type: "Position",
                value: this.getPositionFull(player.primaryPosition)
            },
            {
                trait_type: "Bats",
                value: player.hits
            },
            {
                trait_type: "Throws",
                value: player.throws
            },
            {
                trait_type: "Overall Rating",
                value: player.overallRating.toFixed(2)
            },
            {
                trait_type: "Speed",
                value: player.hittingRatings.speed.toString()
            },
            {
                trait_type: "Steals",
                value: player.hittingRatings.steals.toString()
            },
            {
                trait_type: "Defense",
                value: player.hittingRatings.defense.toString()
            },
            {
                trait_type: "Arm",
                value: player.hittingRatings.arm.toString()
            },
            {
                trait_type: "Ground Ball",
                value: (player.hittingRatings.contactProfile.groundball * .1).toFixed(1).toString()
            },
            {
                trait_type: "Fly Ball",
                value: (player.hittingRatings.contactProfile.flyBall * .1).toFixed(1).toString()
            },
            {
                trait_type: "Line Drive",
                value: (player.hittingRatings.contactProfile.lineDrive * .1).toFixed(1).toString()
            },
            {
                trait_type: "Contact vs L",
                value: player.hittingRatings.vsL.contact.toString()
            },
            {
                trait_type: "Contact vs R",
                value: player.hittingRatings.vsR.contact.toString()
            },
            {
                trait_type: "Gap Power vs L",
                value: player.hittingRatings.vsL.gapPower.toString()
            },
            {
                trait_type: "Gap Power vs R",
                value: player.hittingRatings.vsR.gapPower.toString()
            },
            {
                trait_type: "Home Run Power vs L",
                value: player.hittingRatings.vsL.homerunPower.toString()
            },
            {
                trait_type: "Home Run Power vs R",
                value: player.hittingRatings.vsR.homerunPower.toString()
            },
            {
                trait_type: "Plate Discipline vs L",
                value: player.hittingRatings.vsL.plateDiscipline.toString()
            },
            {
                trait_type: "Plate Discipline vs R",
                value: player.hittingRatings.vsR.plateDiscipline.toString()
            },
            {
                trait_type: "Power (Pitch)",
                value: player.pitchRatings.power.toString()
            },
            {
                trait_type: "Control vs L (Pitch)",
                value: player.pitchRatings.vsL.control.toString()
            },
            {
                trait_type: "Control vs R (Pitch)",
                value: player.pitchRatings.vsR.control.toString()
            },
            {
                trait_type: "Movement vs L (Pitch)",
                value: player.pitchRatings.vsL.movement.toString()
            },
            {
                trait_type: "Movement vs R (Pitch)",
                value: player.pitchRatings.vsR.movement.toString()
            },
            {
                trait_type: "Ground Ball (Pitch)",
                value: (player.pitchRatings.contactProfile.groundball * .1).toFixed(1).toString()
            },
            {
                trait_type: "Fly Ball (Pitch)",
                value: (player.pitchRatings.contactProfile.flyBall * .1).toFixed(1).toString()
            },
            {
                trait_type: "Line Drive (Pitch)",
                value: (player.pitchRatings.contactProfile.lineDrive * .1).toFixed(1).toString()
            }
        ]


        return result

    }

    createGeneratingNFTMetadata(coverImage: Image, animation: Animation) {

        let result: NFTMetadata = {
            description: ''
        }

        result.animation_url = `ipfs://${animation.cid}`
        result.image = `ipfs://${coverImage.cid}`

        return result

    }

    async list(options?: any): Promise<Player[]> {
        return this.playerRepository.list(options)
    }

    async getPlayerIdsByGameDate(date:Date, options?:any) {
        return this.playerRepository.getPlayerIdsByGameDate(date, options)
    }


    getHandednessFull(handedness: Handedness) {
        return PlayerService.getHandednessFull(handedness)
    }

    static getHandednessFull(handedness: Handedness) {

        switch (handedness) {

            case Handedness.L:
                return "Left"
            case Handedness.R:
                return "Right"
            case Handedness.S:
                return "Switch"
        }
    }

    getPositionFull(position: Position) {
        return PlayerService.getPositionFull(position)
    }

    static getPositionFull(position: Position) {

        switch (position) {
            case Position.PITCHER:
                return "Pitcher"
            case Position.CATCHER:
                return "Catcher"
            case Position.FIRST_BASE:
                return "First Base"
            case Position.SECOND_BASE:
                return "Second Base"
            case Position.THIRD_BASE:
                return "Third Base"
            case Position.SHORTSTOP:
                return "Shortstop"
            case Position.LEFT_FIELD:
                return "Left Field"
            case Position.CENTER_FIELD:
                return "Center Field"
            case Position.RIGHT_FIELD:
                return "Right Field"
        }
    }



    async clearAllTransactions(options?: any): Promise<void> {
        return this.playerRepository.clearAllTransactions(options)
    }




    async getPlayerViewModels(startDate:Date, league:League, positions:Position[], sortColumn:string, sortDirection:string, options?:any) : Promise<any[]> {

        let season:Season = await this.seasonService.getByDate(startDate)

        let tlss:TeamLeagueSeason[] = []

        let plss:PlayerLeagueSeason[]

        if (league) {

            plss = await this.playerLeagueSeasonService.getByLeagueSeason(league, season, positions, sortColumn, sortDirection, options)

            let teamIds = Array.from(new Set(plss.map( p => p.teamId )))
            let teamSeasonIds:TeamSeasonId[] = teamIds.map( t => { return { teamId: t, seasonId: season._id } })

            tlss = await this.teamLeagueSeasonService.getByTeamSeasonIds( teamSeasonIds)

        } else {

            plss = await this.playerLeagueSeasonService.getFreeAgentsBySeason(season, positions, sortColumn, sortDirection, options)
        }

    
        return plss.map(pls => {

            let p:PlayerLeagueSeason = pls.get({ plain: true})

            let tls = tlss.find( tl => tl.teamId == p.teamId)
            let t = tls?.get({ plain: true})

            let vm:any = {
                _id: p.player._id,
                coverImageCid: p.player.coverImageCid,
                fullName: `${p.player.firstName} ${p.player.lastName}`,
                firstName: p.player.firstName,
                lastName: p.player.lastName,
                primaryPosition: p.primaryPosition,
                age: p.age,
                zodiacSign: p.player.zodiacSign,
                ownerId: p.player.ownerId,
                throws: p.player.throws,
                hits: p.player.hits,
                lastGamePlayed: p.player.lastGamePlayed,

                overallRating: p.player.overallRating,
                pitchRatings: p.pitchRatings,
                hittingRatings: p.hittingRatings,

                potentialOverallRating: p.player.potentialOverallRating,
                potentialPitchRatings: p.potentialPitchRatings,
                potentialHittingRatings: p.potentialHittingRatings,

                careerStats: p.player.careerStats,
                seasonStats: p.stats,
                stamina: p.player.stamina
            }

            if (t) {
                vm.team = {
                    name: t.team.name,
                    cityName: t.city?.name,
                    _id: t.teamId,
                    abbrev: t.team.abbrev,
                    owner: {
                        _id: t.team.userId
                    }
                    
                }

            } else {

                const daysFreeAgent = Math.max( 0, dayjs().startOf('day').diff(  dayjs(pls.startDate).startOf('day'), 'day' ))

                vm.askingPrice =  this.getFreeAgentSalary(p.player.overallRating, PLAYER_LEAGUE_AVERAGE_RATING, daysFreeAgent)

            
            }


            return vm

        })


    }

    getAskingPrice(pls:PlayerLeagueSeason) {

        let plsPlain = pls.get({ plain: true})

        const daysFreeAgent = Math.max( 0, dayjs().startOf('day').diff(  dayjs(pls.startDate).startOf('day'), 'day' ))

        return this.getFreeAgentSalary(plsPlain.player.overallRating, PLAYER_LEAGUE_AVERAGE_RATING, daysFreeAgent)
    }


    getFreeAgentSalary( playerRating: number, leagueAvgRating: number, daysFreeAgent: number ) {

        const daysOnMarket = Math.max(
            0,
            Math.min(daysFreeAgent, FREE_AGENT_DAYS_TO_FLOOR)
        )

        const marketProgress = daysOnMarket / FREE_AGENT_DAYS_TO_FLOOR

        // Steep early drop, flat late
        const STEEPNESS = 3
        const decayMultiplier = Math.pow(1 - marketProgress, STEEPNESS)

        /**
         * Rating discount ONLY (never increases price)
         * League-average or better starts at 250
         * Worse players start cheaper
         */
        const STEP = 12
        const ratingDelta = playerRating - leagueAvgRating

        const ratingMultiplier = Math.pow(
            2,
            Math.min(0, ratingDelta) / STEP
        )

        const startingPrice =
            STARTING_FREE_AGENT_PRICE * ratingMultiplier

        const price =
            FREE_AGENT_FLOOR_PRICE +
            (startingPrice - FREE_AGENT_FLOOR_PRICE) * decayMultiplier

        const finalPrice = Math.max(
            FREE_AGENT_FLOOR_PRICE,
            Math.round(price)
        )

        return ethers
            .parseUnits(finalPrice.toString(), 'ether')
            .toString()
    }

    getYearsContractAsk(yearsOld: number): number {

        switch (yearsOld) {

            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
            case 30:
                return 7
            case 31:
                return 6
            case 32:
                return 6
            case 33:
                return 5
            case 34:
                return 5
            case 35:
                return 4
            case 36:
                return 3
            case 37:
                return 2
            case 38:
                return 2
            case 39:
                return 1
            case 40:
                return 1
            case 41:
                return 1
            case 42:
                return 1
            case 43:
                return 1
            case 44:
                return 1

        }

    }

    async getFreeAgentPitcherIds(date:Date, options?:any): Promise<string[]> {
        return this.playerRepository.getFreeAgentPitcherIds(date, options)
    }

    async getFreeAgentHitterIds(date:Date, options?:any): Promise<string[]> {
        return this.playerRepository.getFreeAgentHitterIds(date, options)

    }

    async getFreeAgentIdsByPositionAndSalary(position:Position, salary:bigint, date:Date, limit:number, offset:number, options?:any): Promise<string[]> {
        return this.playerRepository.getFreeAgentIdsByPositionAndSalary(position, salary, date, limit, offset, options)
    }


    randomPersonalityType(rng) : PersonalityType {

        const mbtiOrder = Object.keys(PersonalityType) as (keyof typeof PersonalityType)[]

        const weights = [13.8, 12.3, 11.6, 8.8, 8.7, 8.5, 8.1, 5.4, 4.4, 4.3, 3.3, 3.2, 2.5, 2.1, 1.8, 1.5]

        return this.rollService.weightedRandom(rng, mbtiOrder, weights) as PersonalityType

    }


    ratingToGrade(rating: number): PlayerGrade {
        return this.playerSharedService.ratingToGrade(rating)
    }


    getExperiencePerGame(hadGoodGame:boolean, isPitcher:boolean) : bigint {
        return this.playerSharedService.getExperiencePerGame(hadGoodGame, isPitcher)
    }


    experienceToOverallRating(totalExperience: bigint): number {
        return this.playerSharedService.experienceToOverallRating(totalExperience)
    }


    // async updateAllPercentileRatings() {

    //     //Make sure that players have percentile ratings. 
    //     let s = await this.sequelize()

    //     await s.transaction(async (t1) => {

    //         let options = { transaction: t1 }

    //         let playerPercentileRatings = await this.getPlayerPercentileRatings(options)

    //         let season:Season = await this.seasonService.getMostRecent(options)

    //         for (let pRating of playerPercentileRatings) {
            
    //             //Update player
    //             let player:Player = await this.get(pRating._id, options)

    //             player.percentileRatings = pRating
    //             player.changed("percentileRatings", true)

    //             await this.put(player, options)


    //             //Update pls
    //             let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getByPlayerSeason(player, season, options)

    //             pls.percentileRatings = pRating
    //             pls.changed("percentileRatings", true)

    //             await this.playerLeagueSeasonService.put(pls, options)

    //         }

    //     })

    // }



}



interface RowItemViewModel {
    _id: string
    title: string
    tokenId: number
}

interface PlayerRowViewModel {

    _id: string
    coverImageCid:string
    fullName: string
    firstName: string
    lastName: string
    primaryPosition: Position
    age: number
    zodiacSign: string
    throws: Handedness
    hits: Handedness
    lastGamePlayed: Date

    overallRating:number
    pitchRatings:PitchRatings
    hittingRatings:HittingRatings

    potentialOverallRating:number
    potentialPitchRatings:PitchRatings
    potentialHittingRatings:HittingRatings    

    teamId?:string,
    team?: {
        _id?:string
        name?:string
        cityName?:string
    }

    stats?: PlayerStatLines

}





// const LEAGUE_AVERAGE_CONTACT_TYPE: ContactType = {
//     groundball: 43,
//     lineDrive: 21,
//     flyBall: 36
// }

const LEAGUE_AVERAGE_FIELDER_CHANCE_R: FielderChance = {
    first: 8,
    second: 13,
    third: 10,
    catcher: 2,
    shortstop: 14,
    leftField: 17,
    centerField: 18,
    rightField: 13,
    pitcher: 5
}

const LEAGUE_AVERAGE_FIELDER_CHANCE_L: FielderChance = {
    first: 10,
    second: 15,
    third: 8,
    catcher: 2,
    shortstop: 12,
    leftField: 13,
    centerField: 18,
    rightField: 17,
    pitcher: 5
}

const LEAGUE_AVERAGE_SHALLOW_DEEP_CHANCE: ShallowDeepChance = {
    shallow: 20,
    normal: 60,
    deep: 20
}

const LEAGUE_AVERAGE_RATING: number = 40

//Based on 0-99 average. Adjusted from 2023 pitch data.
const LEAGUE_AVERAGE_IN_ZONE_BY_COUNT: InZoneByCount[] = [
    { balls: 0, strikes: 0, inZone: 52 },
    { balls: 0, strikes: 1, inZone: 44 },
    { balls: 0, strikes: 2, inZone: 32 },
    { balls: 1, strikes: 0, inZone: 54 },
    { balls: 1, strikes: 1, inZone: 48 },
    { balls: 1, strikes: 2, inZone: 37 },
    { balls: 2, strikes: 0, inZone: 57 },
    { balls: 2, strikes: 1, inZone: 54 },
    { balls: 2, strikes: 2, inZone: 45 },
    { balls: 3, strikes: 0, inZone: 61 },
    { balls: 3, strikes: 1, inZone: 59 },
    { balls: 3, strikes: 2, inZone: 56 }
]

const LEAGUE_AVERAGE_BALL_SWING_BY_COUNT: BallSwingByCount[] = [
    { balls: 0, strikes: 0, swing: 16 },
    { balls: 0, strikes: 1, swing: 28 },
    { balls: 0, strikes: 2, swing: 34 },
    { balls: 1, strikes: 0, swing: 23 },
    { balls: 1, strikes: 1, swing: 32 },
    { balls: 1, strikes: 2, swing: 38 },
    { balls: 2, strikes: 0, swing: 22 },
    { balls: 2, strikes: 1, swing: 33 },
    { balls: 2, strikes: 2, swing: 43 },
    { balls: 3, strikes: 0, swing: 3 },
    { balls: 3, strikes: 1, swing: 27 },
    { balls: 3, strikes: 2, swing: 45 }
] 

// const LEAGUE_AVERAGE_STRIKE_SWING_BY_COUNT: StrikeSwingByCount[] = [
//     { balls: 0, strikes: 0, swing: 64 },
//     { balls: 0, strikes: 1, swing: 81 },
//     { balls: 0, strikes: 2, swing: 88 },
//     { balls: 1, strikes: 0, swing: 71 },
//     { balls: 1, strikes: 1, swing: 83 },
//     { balls: 1, strikes: 2, swing: 91 },
//     { balls: 2, strikes: 0, swing: 70 },
//     { balls: 2, strikes: 1, swing: 82 },
//     { balls: 2, strikes: 2, swing: 91 },
//     { balls: 3, strikes: 0, swing: 53 },
//     { balls: 3, strikes: 1, swing: 78 },
//     { balls: 3, strikes: 2, swing: 90 }
// ]

const LEAGUE_AVERAGE_IN_ZONE_RATE: number = 49.6

const LEAGUE_AVERAGE_STRIKE_SWING_RATE: number = 67.6
const LEAGUE_AVERAGE_BALL_SWING_RATE: number = 28.5


const LEAGUE_AVERAGE_ZONE_SWING_CONTACT_RATE: number = 82.2
const LEAGUE_AVERAGE_CHASE_SWING_CONTACT_RATE: number = 56

const LEAGUE_AVERAGE_FOUL_RATE = 50


const LEAGUE_AVERAGE_PITCH_QUALITY = 50

const LEAGUE_AVERAGE_POWER_ROLL_INPUT: PowerRollInput = {
    out: 649,
    singles: 200,
    doubles: 75,
    triples: 8,
    hr: 68
}

const LEAGUE_AVERAGE_CONTACT_TYPE_INPUT: ContactTypeRollInput = {
    groundball: 44,
    flyBall: 35,
    lineDrive: 21
}


interface RatingPlayer {
    _id: number,
    rating: Rating
}


interface ScoutPlayerCommand {
    type: Position
    onDate:string
}


interface NFTMetadata {

    tokenId?: number

    name?: string
    description?: string

    image?: string
    image_data?: string

    external_url?: string

    attributes?: AttributeSelection[]

    background_color?: string
    animation_url?: string
}


interface AttributeSelection {
    id?: string
    trait_type?: string
    value?: string
}


export {
    PlayerService, GLICKO_SETTINGS, RatingPlayer, NFTMetadata, RowItemViewModel, PlayerRowViewModel, PLAYER_RETIREMENT_AGE
}
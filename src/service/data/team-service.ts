import { inject, injectable } from "inversify";

import {  DiamondMintPass, Team, TEAM_COLORS } from "../../dto/team.js";
import { TeamRepository } from "../../repository/team-repository.js";

import { Player } from "../../dto/player.js";
import {   PlayerService } from "./player-service.js";
import { City } from "../../dto/city.js";
import {  ContractType, DEFAULT_ROSTER_CONSTRAINTS, DevelopmentStrategy, FinanceSeason, GLICKO_SETTINGS, Lineup, OverallRecord, PlayerRowViewModel, Rating, SeasonInfo, TEAMS_PER_TIER, TeamViewModel } from "../enums.js";
import {  TeamRecord } from "../../repository/node/team-repository-impl.js";
import { GameRepository } from "../../repository/game-repository.js";
import { Game } from "../../dto/game.js";
import dayjs from "dayjs";
import { Stadium } from "../../dto/stadium.js";
import { League } from "../../dto/league.js";
import { FinanceService } from "../finance-service.js";
import { Season } from "../../dto/season.js";
import {  ethers, Wallet } from "ethers";
import { TeamLeagueSeason } from "../../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { PlayerLeagueSeason } from "../../dto/player-league-season.js";
import { PlayerLeagueSeasonService } from "./player-league-season-service.js";
import { OffchainEventService } from "./offchain-event-service.js";
import { GameService, GameSummaryViewModel } from "./game-service.js";
import { User } from "../../dto/user.js";
import { v4 as uuidv4 } from 'uuid';
import { ImageService } from "./image-service.js";
import { LineupService } from "../lineup-service.js";
import { TeamQueueService } from "./team-queue-service.js";
import { StatService } from "../stat-service.js";
import { TeamSharedService } from "../shared/team-shared-service.js";
import { Colors, PitchingRoleType, Position, RotationPitcher } from 'baseball-sim-engine';
import { SeasonService } from "./season-service.js";


const MAX_ROSTER_SIZE = 13

@injectable()
class TeamService {

    @inject("TeamRepository")
    private teamRepository: TeamRepository

    @inject("GameRepository")
    private gameRepository: GameRepository

    @inject("sequelize")
    private sequelize:Function
n

    constructor(
        private playerService: PlayerService,
        private teamLeagueSeasonService: TeamLeagueSeasonService,
        private playerLeagueSeasonService: PlayerLeagueSeasonService,
        private financeService: FinanceService,
        private seasonService:SeasonService,
        private offchainEventService:OffchainEventService,
        private gameService:GameService,
        private imageService:ImageService,
        private teamQueueService:TeamQueueService,
        private statService:StatService,
        private teamSharedService:TeamSharedService
    ) { }


    async get(_id: string, options?: any): Promise<Team> {
        return this.teamRepository.get(_id, options)
    }

    async getByIds(_ids: string[], options?: any): Promise<Team[]> {
        return this.teamRepository.getByIds(_ids, options)
    }

    async getWithCityAndStadium(_id: string, options?: any): Promise<Team> {
        return this.teamRepository.getWithCityAndStadium(_id, options)
    }

    async put(team: Team, options?: any) {
        return this.teamRepository.put(team, options)
    }

    async getByUser(user: User, options?: any): Promise<Team[]> {
        return this.teamRepository.getByUser(user, options)
    }

    async getRatings(options?: any) {
        return this.teamRepository.getRatings(options)
    }

    async getUpdatedSince(lastUpdated: Date, options?: any): Promise<Team[]> {
        return this.teamRepository.getUpdatedSince(lastUpdated, options)
    }

    async getOverallRecordsBySeason(season: Season, options?: any): Promise<TeamRecord[]> {
        return this.teamRepository.getOverallRecordsBySeason(season, options)
    }


    async getOverallRecordBySeason(team:Team, season:Season, options?:any): Promise<TeamRecord> {
        return this.teamRepository.getOverallRecordBySeason(team, season, options)
    }

    async listByLeagueAndSeason(league: League, season: Season, options?: any) {
        return this.teamRepository.listByLeagueAndSeason(league, season, options)
    }

    async listBySeason(season: Season, options?: any): Promise<Team[]> {
        return this.teamRepository.listBySeason(season, options)
    }

    async list(limit: number, offset: number, options?: any) {
        return this.teamRepository.list(limit, offset, options)
    }

    async count(options?: any): Promise<number> {
        return this.teamRepository.count(options)
    }

    async countByLeague(league: League, options?: any): Promise<number> {
        return this.teamRepository.countByLeague(league, options)
    }

    async getClosetRatedBot(rating:number, options?:any): Promise<Team> {
        return this.teamRepository.getClosetRatedBot(rating, options)
    }

    async addToLeagueSeason(team: Team, league: League, season: Season, options?: any) {
        return this.teamRepository.addToLeagueSeason(team, league, season, options)
    }

    async getTeamIdsBySeason(season:Season, options?:any) : Promise<string[]> {
        return this.teamRepository.getTeamIdsBySeason(season, options)
    }

    async getTeamIdsByGameDate(date:Date, options?:any) : Promise<string[]> {
        return this.teamRepository.getTeamIdsByGameDate(date, options)
    }

    async getRatingsForIds(teamIds:string[], options?:any) {
        return this.teamRepository.getRatingsForIds(teamIds, options)
    }

    async getSeasonHistory(team: Team, options?: any): Promise<SeasonHistory[]> {

        let tlss: TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeam(team, options)

        return tlss.map(tls => {

            let t: TeamLeagueSeason = tls.get({ plain: true })

            return {
                overallRecord: t.overallRecord,
                startDate: t.season?.startDate,
                endDate: t.season?.endDate,
                leagueRank: t.league.rank,
                rating: t.seasonRating,
                financeSeason: t.financeSeason
            }
        })
    }

    async getTeamViewModel(team: Team, season: Season, seasonInfo:SeasonInfo, userOwner:User, options?: any): Promise<TeamViewModel> {

        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)
        let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

        let t = tls.get({ plain: true })

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id, options)
        let nextStarter:RotationPitcher = this.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss)

        let isQueued = await this.teamQueueService.isTeamQueued(team, options)

        let games:Game[] = await this.gameService.getRecentByTeam(team, Object.assign({ limit: 5 }, options) )

        let minimumPlayerSalary = this.playerService.getFreeAgentSalary(1, 50, 365)

        let events = await this.offchainEventService.getByTeamId(team._id, Object.assign({ limit: 5, offset: 0 }, options) )
        let eventsViewModel = await this.offchainEventService.getOffChainEventViewModels(events, season, options)
        
        let plainPLSS = plss.map(p => p.get({ plain: true }))

        let minimumGames = this.teamLeagueSeasonService.getMinimumCompletedGamesForStandings(seasonInfo.dayNumber, seasonInfo.totalDays)

        let inProgressGame = games.find( g => !g.isFinished)

        let gamesPlayed = tls.overallRecord.wins + tls.overallRecord.losses 

        if (inProgressGame?._id != undefined) {
            gamesPlayed++
        }

        let isQualified = gamesPlayed >= minimumGames

        let teamViewModel = {
            
            team: {
                _id: team._id,
                diamondBalance: diamondBalance,
                minimumPlayerSalary: minimumPlayerSalary,
                logoId: tls.logoId,
                name: team.name,
                colors: team.colors,
                abbrev: team.abbrev,
                city: t.city,
                stadium: t.stadium,
                lineups: t.lineups,
                seasonRating: t.seasonRating,
                longTermRating: t.longTermRating,
                fanInterestShortTerm: t.fanInterestShortTerm,
                fanInterestLongTerm: t.fanInterestLongTerm,
                hasValidLineup: t.hasValidLineup,
                leagueRank: t.league.rank,
                overallRank: t.overallRecord.rank + ((t.league.rank - 1) * TEAMS_PER_TIER),
                overallRecord: t.overallRecord,
                financeSeason: t.financeSeason,
                isQueued: isQueued,
                developmentStrategy: team.developmentStrategy,

                owner: {
                    _id: team.userId,
                    discordId: userOwner?.discordId,
                    discordUsername: userOwner?.discordProfile?.global_name
                },
                isQualified: isQualified
            },
            players: plainPLSS.map(pls => this.translatePLSToPlayerRowViewModel(pls.player, pls, pls.player._id == nextStarter?._id) ),

            completedGames: games?.filter(g => g.isFinished == true).map( g => this.gameService.getGameSummaryViewModel(g)),
            inProgressGame: inProgressGame,
            eventsViewModel: eventsViewModel
        }


        return teamViewModel

    }

    public translatePLSToPlayerRowViewModel(player:Player, pls:PlayerLeagueSeason, isNextStarter:boolean): PlayerRowViewModel {

        return {
            _id: pls.playerId,
            coverImageCid: player.coverImageCid,
            fullName: `${player.firstName} ${player.lastName}`,
            firstName: player.firstName,
            lastName: player.lastName,
            primaryPosition: pls.primaryPosition,
            age: pls.age,
            zodiacSign: player.zodiacSign,
            throws: player.throws,
            hits: player.hits,
            lastGamePlayed: player.lastGamePlayed,
            lastGamePitched: player.lastGamePitched,

            overallRating: player.overallRating,
            pitchRatings: pls.pitchRatings,
            hittingRatings: pls.hittingRatings,

            potentialOverallRating: player.potentialOverallRating,
            potentialPitchRatings: pls.potentialPitchRatings,
            potentialHittingRatings: pls.potentialHittingRatings,

            careerStats: player.careerStats,
            seasonStats: pls.stats,
            isNextStarter: isNextStarter,
            stamina: player.stamina,
            maxPitchCount: player.maxPitchCount

        }

    }

    async getBasicTeamViewModel(team: Team, season:Season, options?:any){

        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        let tlsPlain = tls.get({ plain: true })

        return {
            _id: team._id,
            logoId: tlsPlain.logoId,
            name: team.name,
            colors: team.colors,
            abbrev: team.abbrev,
            city: tlsPlain.city,
            stadium: tlsPlain.stadium,
            leagueRank: tlsPlain.league.rank,
            userId: team.userId,
            overallRank: tls.overallRecord.rank + ((tlsPlain.league.rank - 1) * TEAMS_PER_TIER),
            overallRecord: tls.overallRecord,
            financeSeason: tls.financeSeason
        }

    }

    async getTeamGameLogViewModels(team: Team, start: Date, end: Date, options?: any): Promise<GameSummaryViewModel[]> {

        let gameIds = await this.gameRepository.getIdsByTeamAndPeriod(team, start, end, options)

        if (gameIds.length == 0) return []

        return this.getTeamGameViewModelsById(gameIds, options)

    }

    private async getTeamGameViewModelsById(gameIds, options?: any) {

        let games: Game[] = await this.gameRepository.getByIds(gameIds, options)

        //Sort so it matches ids order
        games.sort(function (a, b) {
            return gameIds.indexOf(a._id) - gameIds.indexOf(b._id)
        })

        return games.map(g => { return this.gameService.getGameSummaryViewModel(g) })
    }

    createTeamGameViewModel(team: Team, g: Game) {

        let teamInfo = [g.home, g.away].find( t => t._id == team._id)
        let oppTeamInfo = [g.home, g.away].find( t => t._id != team._id)

        let teamFinances = g.home._id == team._id ? g?.home.finances : g?.away.finances
        let oppFinances = g.home._id == team._id ? g?.away.finances : g?.home.finances

        let allPlayers = [].concat(g.away.players).concat(g.home.players)

        let wp: any = {}
        let lp: any = {}

        if (g.winningPitcherId) {

            let winningPitcher = allPlayers?.find(p => p._id == g.winningPitcherId)

            wp._id = winningPitcher.playerId
            wp.name = winningPitcher.displayName
        }

        if (g.losingPitcherId) {

            let losingPitcher = allPlayers?.find(p => p._id == g.losingPitcherId)

            lp._id = losingPitcher.playerId
            lp.name = losingPitcher.displayName
        }

        return {
            _id: g._id,
            isHome: g.home._id == team._id,
            currentInning: g.currentInning,
            isTopInning: g.isTopInning,
            isComplete: g.isComplete,
            startDate: g.startDate,

            winningPitcher: g.winningPitcherId ? wp : undefined,
            losingPitcher: g.losingPitcherId ? lp : undefined,

            team: {
                _id: teamInfo._id,
                abbrev: teamInfo.abbrev,
                name: teamInfo.name,
                seasonRating: teamInfo.seasonRating,
                longTermRating: teamInfo.longTermRating,
                wins: g.isComplete ? teamInfo.overallRecord.after?.wins : teamInfo.overallRecord.before?.wins,
                losses: g.isComplete ? teamInfo.overallRecord.after?.losses : teamInfo.overallRecord.before?.losses,
                runs: g.home._id == team._id ? g.score.home : g.score.away,
                isWinner: g.winningTeamId == teamInfo._id,
                isHome: g.home._id == teamInfo._id,
                cityName: teamInfo.cityName,
                finances: teamFinances,
                owner: teamInfo.owner
            },
            opp: {
                _id: oppTeamInfo._id,
                abbrev: oppTeamInfo.abbrev,
                name: oppTeamInfo.name,
                seasonRating: teamInfo.seasonRating,
                longTermRating: teamInfo.longTermRating,
                wins: g.isComplete ? oppTeamInfo.overallRecord.after?.wins : oppTeamInfo.overallRecord.before?.wins,
                losses: g.isComplete ? oppTeamInfo.overallRecord.after?.losses : oppTeamInfo.overallRecord.before?.losses,
                runs: g.home._id == team._id ? g.score.away : g.score.home,
                isWinner: g.winningTeamId == oppTeamInfo._id,
                isHome: g.home._id == oppTeamInfo._id,
                cityName: oppTeamInfo.cityName,
                finances: oppFinances,
                owner: oppTeamInfo.owner
            }
        }
    }

    getTeamStandingsViewModel(tls:TeamLeagueSeason, team:Team, rank:number) {
    
        return {
            _id: team._id,
            logoId: tls.logoId,
            name: team.name,
            abbrev: team.abbrev,
            city: tls.city,
            owner: {
                _id: team.userId
            },
            seasonRating: tls.seasonRating,
            longTermRating: tls.longTermRating,
            rank: rank,
            fanInterestShortTerm: tls.fanInterestShortTerm,
            fanInterestLongTerm: tls.fanInterestLongTerm,
            hasValidLineup: tls.hasValidLineup,
            overallRecord: tls.overallRecord,
            financeSeason: tls.financeSeason,
            financeSeasonDecimal: {
                diamondBalance: parseFloat(ethers.formatUnits(tls.financeSeason.diamondBalance, "ether")),
                revenue: parseFloat(ethers.formatUnits(tls.financeSeason.revenue.seasonToDate.total, "ether")),
                projectedTotalRevenue: parseFloat(ethers.formatUnits(tls.financeSeason.revenue.projectedTotal.total, "ether")),
            }
        }


    }

    async getStandingsViewModel(currentDate:Date, seasons: Season[], leagues:League[], league: League, season: Season, options?: any) {

        let leagueVm 

        let qualifiyingTeams: TeamLeagueSeason[] = await this.teamLeagueSeasonService.listQualifyingTeamsByLeagueAndSeason(league, season, currentDate, options)
        let nonQualifyingTeams:TeamLeagueSeason[] = await this.teamLeagueSeasonService.listNonQualifyingTeamsByLeagueAndSeason(league, season, currentDate,  { limit: 25, offset: 0 })

        let teamIds = [].concat(qualifiyingTeams.map( t => t.teamId)).concat(nonQualifyingTeams.map( t => t.teamId))


        let allTeams:Team[] = await this.getByIds(teamIds, options)

        let viewModels = qualifiyingTeams.map((tls, index) => {
            let team = allTeams.find( t => t._id == tls.teamId)
            return this.getTeamStandingsViewModel(tls, team, index + 1)
        })

        let nonQualifyingViewModels = nonQualifyingTeams.map((tls, index) => {
            let team = allTeams.find( t => t._id == tls.teamId)
            return this.getTeamStandingsViewModel(tls, team, index + 1)
        })

        leagueVm = {
            league: league,
            viewModels: viewModels,
            nonQualifyingViewModels: nonQualifyingViewModels
        }


        let seasonInfo:SeasonInfo = await this.seasonService.getSeasonInfo(season, currentDate)
        let minimumCompletedGamesForStandings = this.teamLeagueSeasonService.getMinimumCompletedGamesForStandings(seasonInfo.dayNumber, seasonInfo.totalDays)

        return {
            minimumCompletedGamesForStandings: minimumCompletedGamesForStandings,
            season: season,
            seasonInfo: seasonInfo,
            seasons: seasons.map(s => {
                return {
                    _id: s._id,
                    startDate: dayjs(s.startDate).format("YYYY-MM-DD")
                }
            }),
            leagueVm: leagueVm,
            leagues: leagues.map(l => {
                return {
                    _id: l._id,
                    name: l.name,
                    rank: l.rank
                }
            })
        }

    }

    async listBasicViewModels(leagues: League[], season: Season, options?: any) {

        let leagueVms = []

        for (let league of leagues) {

            let teams: TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

            let teamViewModels = teams.map((t, index) => {
                t = t.get({ plain: true })

                return {
                    _id: t.team._id,
                    name: t.team.name,
                    city: {
                        name: t.city.name,
                        state: t.city.state
                    },
                    colors: t.team.colors,
                    rank: index + 1

                }

            })

            leagueVms.push({
                league: {
                    name: league.name,
                    rank: league.rank
                },
                teams: teamViewModels,
            })

        }

        return leagueVms

    }

    // validateRoster(owner:User, players: Player[]) {

    //     //Make sure there's the right number of players
    //     if (players.length > MAX_ROSTER_SIZE) {
    //         throw new Error(`Roster must have ${MAX_ROSTER_SIZE} players.`)
    //     }

    //     //Make sure they're owned by the right owner and eligible
    //     for (let player of players) {

    //         if (player.ownerId != owner.address) {
    //             throw new Error(`Can not add unowned player to team roster.`)
    //         }

    //     }

    // }

    // validateLineups(team:Team, tls: TeamLeagueSeason, plss: PlayerLeagueSeason[], gameDate: Date) {

    //     tls.hasValidLineup = false

    //     for (let lineup of tls.lineups) {

    //         let startingPitcher: RotationPitcher = this.getStartingPitcherFromPLS(lineup.rotation, plss)

    //         this.validateLineup(team, lineup, plss, startingPitcher)

    //         if (lineup.valid == true) {
    //             tls.hasValidLineup = true
    //         }
    //     }

    // }

    setLineupValidityAllowTiredStarters(team: Team, tls: TeamLeagueSeason, plss: PlayerLeagueSeason[]) {

        tls.hasValidLineup = false

        for (let lineup of tls.lineups) {

            try {

                this.validateLineupAllowTiredStarters(team, lineup, plss)

                if (lineup.valid == true) {
                    tls.hasValidLineup = true
                }

            } catch (ex) { }

        }

    }


    validateLineup(team: Team, lineup: Lineup, plss: PlayerLeagueSeason[], startingPitcher: RotationPitcher) {

        lineup.valid = false

        let orderIds = lineup.order.filter(p => p._id != undefined).map(p => p._id)
        if (orderIds?.length != 8) {
            throw new Error("Lineup must have 9 players.")
        }

        let rotationIds = lineup.rotation.filter(p => p._id != undefined).map(p => p._id)
        if (rotationIds?.length != DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers) {
            throw new Error(`Rotation must have ${DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers} players.`)
        }

        let filledSpots = lineup.order.filter(o => o.position != undefined)
        let filledPositions = new Set(filledSpots.map(o => o.position))

        if (filledPositions.size != filledSpots.length) {
            throw new Error("Duplicate position players.")
        }

        let usedPlayerIds = new Set<string>()

        for (let p of lineup.order) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            if ((!pls || pls.teamId != team._id) && p.position != Position.PITCHER) {
                throw new Error("Invalid player in lineup.")
            }

            if (p.position == Position.PITCHER) {
                if (p._id) throw new Error("Pitcher set to specific ID. Invalid.")
            }

            if (usedPlayerIds.has(p._id)) {
                throw new Error("Duplicate player assignment.")
            }

            usedPlayerIds.add(p._id)

        }

        for (let p of lineup.rotation) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            if ((!pls || pls.teamId != team._id) || pls.player.primaryPosition != Position.PITCHER) {
                throw new Error("Invalid player in rotation.")
            }

            if (usedPlayerIds.has(p._id)) {
                throw new Error("Duplicate player assignment.")
            }

            usedPlayerIds.add(p._id)

        }

        this.validateBullpen(team, lineup, plss, usedPlayerIds)

        if (!startingPitcher) {
            throw new Error(`No valid starting pitcher`)
        }

        if (
            lineup.order.filter(p => p._id != undefined).length == 8 &&
            lineup.order.filter(p => p._id == undefined && p.position == Position.PITCHER).length == 1 &&
            lineup.rotation.filter(p => p._id != undefined).length == DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers &&
            lineup.availablePitchers.filter(p => p.playerId != undefined).length >= DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers
        ) {
            lineup.valid = true
        }

    }

    validateLineupAllowTiredStarters(team: Team, lineup: Lineup, plss: PlayerLeagueSeason[]) {

        lineup.valid = false

        let orderIds = lineup.order.filter(p => p._id != undefined).map(p => p._id)
        if (orderIds?.length != 8) {
            throw new Error("Lineup must have 9 players.")
        }

        let rotationIds = lineup.rotation.filter(p => p._id != undefined).map(p => p._id)
        if (rotationIds?.length != DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers) {
            throw new Error(`Rotation must have ${DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers} players.`)
        }

        let filledSpots = lineup.order.filter(o => o.position != undefined)
        let filledPositions = new Set(filledSpots.map(o => o.position))

        if (filledPositions.size != filledSpots.length) {
            throw new Error("Duplicate position players.")
        }

        let usedPlayerIds = new Set<string>()

        for (let p of lineup.order) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            if ((!pls || pls.teamId != team._id) && p.position != Position.PITCHER) {
                throw new Error("Invalid player in lineup.")
            }

            if (p.position == Position.PITCHER) {
                if (p._id) throw new Error("Pitcher set to specific ID. Invalid.")
            }

            if (usedPlayerIds.has(p._id)) {
                throw new Error("Duplicate player assignment.")
            }

            usedPlayerIds.add(p._id)

        }

        for (let p of lineup.rotation) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            if ((!pls || pls.teamId != team._id) || pls.player.primaryPosition != Position.PITCHER) {
                throw new Error("Invalid player in rotation.")
            }

            if (usedPlayerIds.has(p._id)) {
                throw new Error("Duplicate player assignment.")
            }

            usedPlayerIds.add(p._id)

        }

        this.validateBullpen(team, lineup, plss, usedPlayerIds)

        if (
            lineup.order.filter(p => p._id != undefined).length == 8 &&
            lineup.order.filter(p => p._id == undefined && p.position == Position.PITCHER).length == 1 &&
            lineup.rotation.filter(p => p._id != undefined).length == DEFAULT_ROSTER_CONSTRAINTS.minRotationPitchers &&
            lineup.availablePitchers.filter(p => p.playerId != undefined).length >= DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers
        ) {
            lineup.valid = true
        }

    }

    validateBullpen(team: Team, lineup: Lineup, plss: PlayerLeagueSeason[], usedPlayerIds: Set<string>) {

        if (!lineup.availablePitchers) {
            throw new Error("Bullpen is missing.")
        }

        let bullpenIds = lineup.availablePitchers.filter(p => p.playerId != undefined).map(p => p.playerId)

        if (bullpenIds.length < DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers) {
            throw new Error(`Bullpen must have ${DEFAULT_ROSTER_CONSTRAINTS.minBullpenPitchers} pitchers.`)
        }

        let closers = 0
        let setup = 0
        let middle = 0
        let long = 0
        let mopUp = 0

        for (let p of lineup.availablePitchers) {

            if (!p.playerId) {
                throw new Error("Invalid bullpen pitcher.")
            }

            let pls = plss.find(p2 => p2.player._id == p.playerId)

            if ((!pls || pls.teamId != team._id) || pls.player.primaryPosition != Position.PITCHER) {
                throw new Error("Invalid player in bullpen.")
            }

            if (usedPlayerIds.has(p.playerId)) {
                throw new Error("Duplicate player assignment.")
            }

            if (!p.role) {
                throw new Error("Bullpen pitcher is missing role.")
            }

            if (!p.priority || p.priority < 1) {
                throw new Error("Bullpen pitcher is missing priority.")
            }

            if (p.role == PitchingRoleType.CLOSER) closers++
            if (p.role == PitchingRoleType.SETUP) setup++
            if (p.role == PitchingRoleType.MIDDLE) middle++
            if (p.role == PitchingRoleType.LONG) long++
            if (p.role == PitchingRoleType.MOP_UP) mopUp++

            usedPlayerIds.add(p.playerId)

        }

        if (closers < DEFAULT_ROSTER_CONSTRAINTS.minClosers) {
            throw new Error("Bullpen is missing closer.")
        }

        if (setup < DEFAULT_ROSTER_CONSTRAINTS.minSetupRelievers) {
            throw new Error("Bullpen is missing setup relievers.")
        }

        if (middle < DEFAULT_ROSTER_CONSTRAINTS.minMiddleRelievers) {
            throw new Error("Bullpen is missing middle relievers.")
        }

        if (long < DEFAULT_ROSTER_CONSTRAINTS.minLongRelievers) {
            throw new Error("Bullpen is missing long relievers.")
        }

        if (mopUp < DEFAULT_ROSTER_CONSTRAINTS.minMopUpRelievers) {
            throw new Error("Bullpen is missing mop-up relievers.")
        }

    }


    getStartingPitcherFromPLS(rotation: RotationPitcher[], plss: PlayerLeagueSeason[]): RotationPitcher {

        const getPlayer = (pls?: PlayerLeagueSeason) => {
            if (!pls) return undefined
            return (pls as any).player ?? pls.get({ plain: true }).player
        }

        let selected: RotationPitcher | undefined
        let bestStamina = -Infinity

        for (const pitcher of rotation) {

            if (!pitcher?._id) {
                continue
            }

            const pls = plss.find(p => p.playerId === pitcher._id)
            const player = getPlayer(pls)

            if (!player) {
                continue
            }

            if (player.isNextStarter === true) {
                return JSON.parse(JSON.stringify(pitcher))
            }

            const stamina = player.stamina ?? 0

            if (stamina > bestStamina) {
                bestStamina = stamina
                selected = JSON.parse(JSON.stringify(pitcher))
            }

        }

        if (!selected) {
            throw new Error("No starting pitcher found from rotation.")
        }

        return selected

    }

    getNextStartDate(team: Team): Date {

        let mostRecentStartDate: Date = team.lastGamePlayed

        let nextStartDate

        if (mostRecentStartDate) {
            nextStartDate = dayjs(mostRecentStartDate).add(1, 'days').toDate()
            nextStartDate.setHours(0, 0, 0)
            return nextStartDate
        }

        nextStartDate = new Date(new Date().toUTCString())

        if (nextStartDate.getHours() >= 13) {
            //If it's past 1pm
            nextStartDate = dayjs(nextStartDate).add(1, 'days').toDate()
        }

        nextStartDate.setHours(0, 0, 0)

        return nextStartDate

    }


    getTeamCost(financeSeason:FinanceSeason) {

        let revenueWithMultiplier = BigInt(financeSeason.revenue.projectedTotal.total) * BigInt(10)
        let totalDiamonds = revenueWithMultiplier + BigInt(financeSeason.diamondBalance)
  
        let eth = totalDiamonds / BigInt(40000000)
  
        return {
            revenueWithMultiplier: revenueWithMultiplier.toString(),
            totalDiamonds: totalDiamonds.toString(),
            ethCost: eth.toString(),
            ethCostDecimal: parseFloat(eth.toString())
        }

    }

    optimizeLineup(team:Team, tls:TeamLeagueSeason, plss:PlayerLeagueSeason[], date:Date) {

        let originalLineup = JSON.parse(JSON.stringify(tls.lineups[0]))
        
        let hitters = plss.filter( p => p.player.primaryPosition != Position.PITCHER)
        let pitchers = plss.filter( p => p.player.primaryPosition == Position.PITCHER)

        hitters.sort( (a, b) => b.stats.hitting.wpa - a.stats.hitting.wpa   )
        pitchers.sort( (a, b) => b.stats.pitching.wpa - a.stats.pitching.wpa  )


        //Make sure the pitcher isn't set to a specific ID
        let p = tls.lineups[0].order.find( p => p.position == Position.PITCHER)
        delete p._id

        //Sort so it matches ids order
        let hitterIds = hitters.map( h => h.playerId)
        tls.lineups[0].order.sort(function(a,b) {

            let aIndex = hitterIds.indexOf( a._id ) > -1 ? hitterIds.indexOf( a._id ) : 8
            let bIndex = hitterIds.indexOf( b._id ) > -1 ? hitterIds.indexOf( b._id ) : 8

            return aIndex - bIndex
        })



        let pitcherIds = pitchers.map( p => p.playerId)
        tls.lineups[0].rotation.sort(function(a,b) {
            return pitcherIds.indexOf( a._id ) - pitcherIds.indexOf( b._id )
        })


        let startingPitcher: RotationPitcher = this.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss)
        this.validateLineup(team, tls.lineups[0], plss, startingPitcher)

        if (originalLineup != tls.lineups[0]) {
            tls.changed("lineups", true)
        }

    }

    async createForUser(user:User, league:League, season:Season, options?:any) : Promise<{team:Team, tls:TeamLeagueSeason}> {

        let financeSeason:FinanceSeason = this.financeService.getDefaultFinanceSeason()

        let team:Team = new Team()
        team._id = uuidv4()
        team.name = user.discordProfile.global_name
        team.userId = user._id

        const colors = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]

        team.colors = {
            color1: colors.color1,
            color2: colors.color2
        }

        team.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
        team.longTermRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
        team.developmentStrategy = { budgetPercent: 50 }

        await this.teamRepository.put(team, options)

        let tls:TeamLeagueSeason = this.teamLeagueSeasonService.initNew(team, league, season, undefined, undefined, financeSeason)

        let logo = await this.imageService.createTeamLogo(team, options)
        tls.logoId = logo._id

        await this.imageService.put(logo, options)

        await this.teamLeagueSeasonService.put(tls, options)

        return {
            team: team,
            tls: tls
        }

    }


    async updateSeasonRecord(team:Team, season:Season, tls:TeamLeagueSeason, options?:any) : Promise<OverallRecord> {

        let result = await this.getOverallRecordBySeason(team, season, options)

        tls.overallRecord = JSON.parse(JSON.stringify(result.overallRecord))
        tls.changed("overallRecord", true)

        return tls.overallRecord

    }

    getDevelopmentExpenseForReward(team: Team, rewardAmount: bigint): bigint {
        return rewardAmount * BigInt(team.developmentStrategy.budgetPercent) / 100n
    }

    getDevelopmentXpMultiplier(team: Team): bigint {
        return this.teamSharedService.getDevelopmentXpMultiplier(team.developmentStrategy.budgetPercent)
    }

    calculateProjectedReward(baseDiamondReward: number, maxRatingDiff: number): bigint {
      return this.teamSharedService.calculateProjectedReward(baseDiamondReward, maxRatingDiff)
    }


    async transferPlayerToTeam(player:Player, fromTeam:Team, toTeam:Team, season:Season, offChainEventTransactionId:string, options?:any): Promise<void> {

        let nowDate = new Date(new Date().toUTCString())

        let pls:PlayerLeagueSeason = await this.playerLeagueSeasonService.getMostRecentByPlayerSeason(player, season, options)

        if (pls.teamId != fromTeam._id) {
            throw new Error("Player is not currently on this team.")
        }

        let toTls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(toTeam, season, options)

        pls.endDate = nowDate

        await this.playerLeagueSeasonService.put(pls, options)

        let nextPLS = new PlayerLeagueSeason()

        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id
        nextPLS.leagueId = toTls.leagueId
        nextPLS.teamId = toTls.teamId
        nextPLS.seasonIndex = pls.seasonIndex + 1
        nextPLS.primaryPosition = pls.primaryPosition
        nextPLS.overallRating = pls.overallRating
        nextPLS.hittingRatings = pls.hittingRatings
        nextPLS.pitchRatings = pls.pitchRatings
        nextPLS.potentialOverallRating = pls.potentialOverallRating
        nextPLS.potentialHittingRatings = pls.potentialHittingRatings
        nextPLS.potentialPitchRatings = pls.potentialPitchRatings
        nextPLS.startDate = nowDate
        nextPLS.endDate = season.endDate
        nextPLS.age = player.age

        nextPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        await this.playerLeagueSeasonService.put(nextPLS, options)

        await this.offchainEventService.createPlayerTransferEvent(
            fromTeam._id,
            toTeam._id,
            player._id,
            offChainEventTransactionId,
            options
        )

        await this.playerService.put(player, options)

    }

}




interface SeasonHistory {
    rating: Rating
    leagueRank: number
    startDate: Date
    endDate: Date
    overallRecord?: {
        wins: number
        losses: number
    }
    financeSeason: FinanceSeason
}

interface TeamGame {
    _id: string
    isComplete: boolean
    currentInning: number
    isTopInning: boolean
    startDate: Date
    winningPitcher?: {
        _id: string
        name: string
    },
    losingPitcher?: {
        _id: string
        name: string
    },

    team: {
        _id: string
        name: string
        abbrev: string
        seasonRating:{
            before?:number
            after?:number
        }
        longTermRating:{
            before?:number
            after?:number
        }
        wins: number
        losses: number
        runs: number
        isWinner: boolean
        isHome: boolean
    }

    opp: {
        _id: string
        name: string
        abbrev: string
        seasonRating:{
            before?:number
            after?:number
        }
        longTermRating:{
            before?:number
            after?:number
        }
        wins: number
        losses: number
        runs: number
        isWinner: boolean
        isHome: boolean
    }

}

export {
    TeamService, TeamGame
}
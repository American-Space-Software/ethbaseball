import { inject, injectable } from "inversify";

import { Colors, DiamondMintPass, FinanceSeason, Lineup, OverallRecord, RotationPitcher, Team, TEAM_COLORS } from "../../dto/team.js";
import { TeamRepository } from "../../repository/team-repository.js";

import { Player } from "../../dto/player.js";
import { GLICKO_SETTINGS, NFTMetadata, PlayerRowViewModel, PlayerService } from "./player-service.js";
import { City } from "../../dto/city.js";
import { ContractType, Position, Rating, TeamInfo, TEAMS_PER_TIER } from "../enums.js";
import { TeamRating, TeamRecord } from "../../repository/node/team-repository-impl.js";
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
import { DiamondMintPassService } from "./diamond-mint-pass-service.js";
import { GameService, GameSummaryViewModel } from "./game-service.js";
import { User } from "../../dto/user.js";
import { v4 as uuidv4 } from 'uuid';
import { ImageService } from "./image-service.js";
import { LineupService } from "../lineup-service.js";
import { TeamQueueService } from "./team-queue-service.js";
import { StatService } from "../stat-service.js";


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
        private lineupService:LineupService,
        private offchainEventService:OffchainEventService,
        private diamondMintPassService:DiamondMintPassService,
        private gameService:GameService,
        private imageService:ImageService,
        private teamQueueService:TeamQueueService,
        private statService:StatService
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

    async getTeamViewModel(currentDate:Date, team: Team, season: Season, userOwner:User, options?: any): Promise<TeamViewModel> {

        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)
        let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

        let t = tls.get({ plain: true })

        let diamondBalance = await this.offchainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)
        let nextStarter:RotationPitcher = this.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss)

        let isQueued = await this.teamQueueService.isTeamQueued(team, options)

        let games:Game[] = await this.gameService.getRecentByTeam(team, { limit: 5 } )


        let minimumPlayerSalary = this.playerService.getFreeAgentSalary(1, 50, 365)


        const ev = await this.offchainEventService.getMostRecentDailyDiamondRewardByTeamId(team._id)

        let yesterdaysRewards

        if (ev?.source?.fromDate) {

            const from = ev?.source?.fromDate
            const isYesterday = dayjs(from).format("YYYY-MM-DD") == dayjs(currentDate).subtract(1, "day").format("YYYY-MM-DD")

            yesterdaysRewards = isYesterday ? (ev?.amount ?? "0") : "0"

        } else {

            yesterdaysRewards = "0"
        }


        return {
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

                owner: {
                    _id: team.userId,
                    discordId: userOwner?.discordId,
                    discordUsername: userOwner?.discordProfile?.username
                },

                yesterdaysRewards: yesterdaysRewards
            },
            players: plss.map(pls => {

                let p: PlayerLeagueSeason = pls.get({ plain: true })

                let isNextStarter = p.player._id == nextStarter?._id

                
                return {
                    _id: p.playerId,
                    coverImageCid: p.player.coverImageCid,
                    displayRating: p.player.displayRating,
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
                    lastGamePitched: p.player.lastGamePitched,

                    pitchRatings: p.pitchRatings,
                    hittingRatings: p.hittingRatings,

                    percentileRatings: p.percentileRatings,

                    careerStats: p.player.careerStats,
                    seasonStats: p.stats,
                    isNextStarter: isNextStarter,
                    stamina: p.player.stamina

                }
            }),
            completedGames: games?.filter(g => g.isFinished == true).map( g => this.gameService.getGameSummaryViewModel(g)),
            inProgressGame: games.find( g => !g.isFinished)
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

    getTeamStandingsViewModel(tls:TeamLeagueSeason, rank:number) {
    
        return {
            _id: tls.team._id,
            logoId: tls.logoId,
            name: tls.team.name,
            abbrev: tls.team.abbrev,
            city: tls.city,
            owner: {
                _id: tls.team.userId
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

    async getStandingsViewModel(seasons: Season[], leagues:League[], league: League, season: Season, options?: any) {

        let leagueVm 

        let teams: TeamLeagueSeason[] = await this.teamLeagueSeasonService.listUserTeamsByLeagueAndSeason(league, season, options)

        let viewModels = teams.map((t, index) => {
            t = t.get({ plain: true })
            return this.getTeamStandingsViewModel(t, index + 1)
        })

        let leagueFinance = {
            cash: "0",
            revenue: "0",
            expenses: "0",
            profit: "0",
            teamCostETH: "0",
            teamCostDiamonds: "0",

            projectedTotalRevenue: "0",
            projectedTotalExpenses: "0",
            projectedTotalProfit: "0"
        }

        for (let vm of viewModels) {
            leagueFinance.cash = (BigInt(leagueFinance.cash) + BigInt(vm.financeSeason.diamondBalance)).toString()
            leagueFinance.revenue = (BigInt(leagueFinance.revenue) + BigInt(vm.financeSeason.revenue.seasonToDate.total)).toString()
            leagueFinance.projectedTotalRevenue = (BigInt(leagueFinance.projectedTotalRevenue) + BigInt(vm.financeSeason.revenue.projectedTotal.total)).toString()
            
        }

        leagueVm = {
            league: league,
            viewModels: viewModels,
            leagueFinance: leagueFinance
        }

        // let financeTotals = {
        //     cash: "0",
        //     expenses:  "0",
        //     profit:  "0",
        //     revenue: "0",
        //     projectedTotalRevenue: "0",
        //     projectedTotalExpenses: "0",
        //     projectedTotalProfit: "0"
        //   }

        //   for (let lf of leagueVms.map( l => l.leagueFinance)) {
        //     financeTotals.cash = (BigInt(financeTotals.cash) + BigInt(lf.cash)).toString()
        //     financeTotals.expenses = (BigInt(financeTotals.expenses) + BigInt(lf.expenses)).toString()
        //     financeTotals.profit = (BigInt(financeTotals.profit) + BigInt(lf.profit)).toString()
        //     financeTotals.revenue = (BigInt(financeTotals.revenue) + BigInt(lf.revenue)).toString()
        //     financeTotals.projectedTotalRevenue = (BigInt(financeTotals.projectedTotalRevenue) + BigInt(lf.projectedTotalRevenue)).toString()
        //     financeTotals.projectedTotalExpenses = (BigInt(financeTotals.projectedTotalExpenses) + BigInt(lf.projectedTotalExpenses)).toString()
        //     financeTotals.projectedTotalProfit = (BigInt(financeTotals.projectedTotalProfit) + BigInt(lf.projectedTotalProfit)).toString()

        //   }


        return {
            season: season,
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

    setLineupValidityAllowTiredStarters(team:Team, tls: TeamLeagueSeason, plss: PlayerLeagueSeason[]) {

        tls.hasValidLineup = false

        for (let lineup of tls.lineups) {

            try {

                this.validateLineupAllowTiredStarters(team, lineup, plss)

                if (lineup.valid == true) {
                    tls.hasValidLineup = true
                }

            } catch(ex) { }

        }

    }


    validateLineup(team: Team, lineup: Lineup, plss: PlayerLeagueSeason[], startingPitcher: RotationPitcher) {

        lineup.valid = false

        //Make sure there are 9 spots in the order and 5 spots in the rotation
        //We should have 8 actual players with ids and an empty pitcher spot in the order.
        let orderIds = lineup.order.filter(p => p._id != undefined).map(p => p._id)
        if (orderIds?.length != 8) {
            throw new Error("Lineup must have 9 players.")
        }

        let rotationIds = lineup.rotation.filter(p => p._id != undefined).map(p => p._id)
        if (rotationIds?.length != 5) {
            throw new Error("Rotation must have 5 players.")
        }

        //Make sure no one is playing a duplicate position
        let filledSpots = lineup.order.filter(o => o.position != undefined)
        let filledPositions = new Set(filledSpots.map(o => o.position))

        if (filledPositions.size != filledSpots.length) {
            throw new Error("Duplicate position players.")
        }

        for (let p of lineup.order) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            //Pitcher spot will not have an id/pitcher
            if ( (!pls || pls.teamId != team._id) && p.position != Position.PITCHER) {
                throw new Error("Invalid player in lineup.")
            }

            if (p.position == Position.PITCHER) {
                if (p._id) throw new Error("Pitcher set to specific ID. Invalid.")
            }

        }

        for (let p of lineup.rotation) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            if ((!pls || pls.teamId != team._id) || pls.player.primaryPosition != Position.PITCHER) {
                throw new Error("Invalid player in rotation.")
            }
        }

        if (!startingPitcher) {
            throw new Error(`No valid starting pitcher`)
        }

        //Lineup must have 8 hitters, one empty pitcher spot, and 5 pitchers in the rotation to be valid.
        if (
            lineup.order.filter(p => p._id != undefined).length == 8 &&
            lineup.order.filter(p => p._id == undefined && p.position == Position.PITCHER).length == 1 &&
            lineup.rotation.filter(p => p._id != undefined).length == 5
        ) {
            lineup.valid = true
        }

    }

    validateLineupAllowTiredStarters(team: Team, lineup: Lineup, plss: PlayerLeagueSeason[]) {

        lineup.valid = false

        //Make sure there are 9 spots in the order and 5 spots in the rotation
        //We should have 8 actual players with ids and an empty pitcher spot in the order.
        let orderIds = lineup.order.filter(p => p._id != undefined).map(p => p._id)
        if (orderIds?.length != 8) {
            throw new Error("Lineup must have 9 players.")
        }

        let rotationIds = lineup.rotation.filter(p => p._id != undefined).map(p => p._id)
        if (rotationIds?.length != 5) {
            throw new Error("Rotation must have 5 players.")
        }

        //Make sure no one is playing a duplicate position
        let filledSpots = lineup.order.filter(o => o.position != undefined)
        let filledPositions = new Set(filledSpots.map(o => o.position))

        if (filledPositions.size != filledSpots.length) {
            throw new Error("Duplicate position players.")
        }

        for (let p of lineup.order) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            //Pitcher spot will not have an id/pitcher
            if ( (!pls || pls.teamId != team._id) && p.position != Position.PITCHER) {
                throw new Error("Invalid player in lineup.")
            }

            if (p.position == Position.PITCHER) {
                if (p._id) throw new Error("Pitcher set to specific ID. Invalid.")
            }

        }

        for (let p of lineup.rotation) {

            if (p?._id == undefined) continue

            let pls = plss.find(p2 => p2.player._id == p._id)

            if ((!pls || pls.teamId != team._id) || pls.player.primaryPosition != Position.PITCHER) {
                throw new Error("Invalid player in rotation.")
            }
        }

        // if (!startingPitcher) {
        //     throw new Error(`No valid starting pitcher for ${dayjs(gameDate).format('YYYY-MM-DD')}`)
        // }

        //Lineup must have 8 hitters, one empty pitcher spot, and 5 pitchers in the rotation to be valid.
        if (
            lineup.order.filter(p => p._id != undefined).length == 8 &&
            lineup.order.filter(p => p._id == undefined && p.position == Position.PITCHER).length == 1 &&
            lineup.rotation.filter(p => p._id != undefined).length == 5
        ) {
            lineup.valid = true
        }

    }

    getStartingPitcherFromPLS( rotation: RotationPitcher[], plss: PlayerLeagueSeason[] ): RotationPitcher {

        const getPlayer = (pls?: PlayerLeagueSeason) => {
            if (!pls) return undefined
            return (pls as any).player ?? pls.get({ plain: true }).player
        }

        const select = (pitcher: RotationPitcher, stamina: number) => {
            selected = JSON.parse(JSON.stringify(pitcher))
            selected.stamina = stamina
        }

        let selected: RotationPitcher | undefined
        let bestStamina = -Infinity

        for (const pitcher of rotation) {
            
            const pls = plss.find(p => p.playerId === pitcher._id)
            const player = getPlayer(pls)
            if (!player) continue

            const stamina = Number(player.stamina ?? 0)

            if (stamina === 1) {
                select(pitcher, stamina)
                break
            }

            if (stamina > bestStamina) {
                bestStamina = stamina
                select(pitcher, stamina)
            }
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

    async updateRoster(lineups: any[], team: Team, options?:any) {

        let currentTLS: TeamLeagueSeason = await this.teamLeagueSeasonService.getMostRecent(team, options)
        let currentPLS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeam(team, options)

        let currentPLSPlain = currentPLS.map( pls => pls.get({ plain: true}))

        currentTLS.lineups = lineups
        currentTLS.changed('lineups', true)

        await this.setLineupValidityAllowTiredStarters(team, currentTLS, currentPLSPlain)

        await this.teamLeagueSeasonService.put(currentTLS, options)
    }

    async signAvailablePlayer(player:Player, pls:PlayerLeagueSeason, tls: TeamLeagueSeason, season: Season, date: Date, offChainEventTransactionId:string, options?: any) {

        // this.playerService.signContract(league, player, season, date)

        this.financeService.signContract(tls, pls, player, season, date)
        this.offchainEventService.createFreeAgentTransferEvent(tls.teamId, player._id, offChainEventTransactionId, options)

        pls.leagueId = tls.leagueId
        pls.teamId = tls.teamId

        await this.playerLeagueSeasonService.put(pls, options)
        await this.playerService.put(player, options)

    }

    listRequiredRosterSpots(roster: PlayerLeagueSeason[]): Position[] {

        let rosterPlain = roster.map(r => r.get({ plain: true }))


        let required: Position[] = []

        let positions = [
            Position.CATCHER,
            Position.FIRST_BASE,
            Position.SECOND_BASE,
            Position.SHORTSTOP,
            Position.THIRD_BASE,
            Position.LEFT_FIELD,
            Position.RIGHT_FIELD,
            Position.CENTER_FIELD,
        ]

        for (let position of positions) {
            let current = rosterPlain.filter(p => p.player.primaryPosition == position).length
            if (current == 0) {
                required.push(position)
            }
        }

        let pitchers = rosterPlain.filter(p => p.player.primaryPosition == Position.PITCHER).length

        while (pitchers < 5) {

            required.push(Position.PITCHER)
            pitchers++
        }

        return required

    }

    async fillAndValidateRoster(tls: TeamLeagueSeason, roster: PlayerLeagueSeason[], season: Season, date: Date, minimumOnly: boolean, options?: any) {

        let added = {
            players:[],
            plss:[]
        }

        let required: Position[] = this.listRequiredRosterSpots(roster)

        //Shuffle so we get every position to fill instead of just the first ones.
        let shuffled = required
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)


        let fillCount=0


        let offChainEventTransactionId = uuidv4()
        for (let position of shuffled) {

            //Find a player from the pool that fits via salary.
            let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getFreeAgentsByPosition(position, season, 1, 0, options)


            let pls: PlayerLeagueSeason
            let player: Player

            if (minimumOnly || plss?.length < 1) {

                //Generate a player.
                player = await this.playerService.scoutPlayer({ onDate: dayjs(date).format("YYYY-MM-DD"), type: position})

                // this.playerService.createRookieContract(player)
                await this.playerService.put(player, options)

                //Fetch again so we have tokenId
                player = await this.playerService.get(player._id, options)

                pls = await this.playerLeagueSeasonService.createPlayerLeagueSeason(player, season, 1, options)

            } else {

                pls = await this.playerLeagueSeasonService.getById(plss[0]._id, options)
                player = await this.playerService.get(plss[0].playerId, options)

            }


            //Sign a player from the player pool.
            await this.signAvailablePlayer(player, pls, tls, season, date, offChainEventTransactionId, options)

            added.players.push(player)
            added.plss.push(pls)

            //Update finances.
            // await updateFinances(team, season, options)

            fillCount++

        }

        if (shuffled?.length > 0) {
            
            // await updateFinances(team, season, options)

            tls.lineups[0].valid = true
            tls.hasValidLineup = true
    
            await this.teamLeagueSeasonService.put(tls, options)
        }


        return added

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

    async createForUser(user:User, league:League, season:Season, financeSeason:FinanceSeason, options?:any) {

        let team:Team = new Team()
        team._id = uuidv4()
        team.name = user.discordProfile.username
        team.userId = user._id

        const colors = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]

        team.colors = {
            color1: colors.color1,
            color2: colors.color2
        }

        team.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
        team.longTermRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }

        await this.put(team, options)

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

    async dropPlayer(pls:PlayerLeagueSeason, player:Player, team:Team, season:Season, date:Date, options?:any) {

        //Update team. Remove from lineup and rotation.
        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        // let tlsPlain:TeamLeagueSeason = tls.get({ plain: true })

        this.lineupService.lineupRemove(tls.lineups[0], player._id)
        this.lineupService.rotationRemove(tls.lineups[0], player._id)

        tls.lineups[0].valid = false
        tls.hasValidLineup = false

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)

        //End current PLS
        pls.endDate = date

        await this.playerLeagueSeasonService.put(pls, options)

        //Create new PLS
        let nextPLS = new PlayerLeagueSeason()
        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id
        nextPLS.seasonIndex = pls.seasonIndex + 1
        nextPLS.primaryPosition = pls.primaryPosition
        nextPLS.overallRating = pls.overallRating
        nextPLS.hittingRatings = pls.hittingRatings
        nextPLS.pitchRatings = pls.pitchRatings
        nextPLS.overallRating = pls.overallRating
        nextPLS.displayRating = pls.displayRating
        nextPLS.startDate = date
        nextPLS.endDate = season.endDate
        nextPLS.age = player.age

        nextPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        await this.playerLeagueSeasonService.put(nextPLS, options)

        //drop the player
        await this.offchainEventService.createPlayerDropTransferEvent(team._id, player._id, uuidv4(), options)


        await this.put(team, options)
        await this.teamLeagueSeasonService.put(tls, options)


    }


    async signPlayer(pls:PlayerLeagueSeason, player:Player, team:Team, season:Season, league:League, date:Date, askingPrice:string, offChainEventTransactionId:string, options?:any) {

        //Update team. Add to lineup/rotation.
        let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        if (player.primaryPosition == Position.PITCHER) {
            let spot = this.lineupService.getFirstAvailableRotationSpot(tls.lineups[0])
            this.lineupService.rotationAdd(tls.lineups[0], player, spot)
        } else {
            let spot = this.lineupService.getFirstAvailableOrderSpot(tls.lineups[0])
            this.lineupService.lineupAdd(tls.lineups[0], player, spot)
        }


        //End current PLS
        pls.startDate = date

        await this.playerLeagueSeasonService.put(pls, options)

        //Create new PLS
        let nextPLS = new PlayerLeagueSeason()
        nextPLS.playerId = pls.playerId
        nextPLS.seasonId = season._id,
        nextPLS.leagueId = league._id,
        nextPLS.teamId = team._id
        nextPLS.seasonIndex = pls.seasonIndex + 1
        nextPLS.primaryPosition = pls.primaryPosition
        nextPLS.overallRating = pls.overallRating
        nextPLS.hittingRatings = pls.hittingRatings
        nextPLS.pitchRatings = pls.pitchRatings
        nextPLS.overallRating = pls.overallRating
        nextPLS.displayRating = pls.displayRating
        nextPLS.startDate = date
        nextPLS.endDate = season.endDate
        nextPLS.age = player.age

        nextPLS.stats = {
            //@ts-ignore
            hitting: this.statService.mergeHitResultsToStatLine({}, {}),
            //@ts-ignore
            pitching: this.statService.mergePitchResultsToStatLine({}, {})
        }

        await this.playerLeagueSeasonService.put(nextPLS, options)


        //Set lineup validity
        let currentTeamPLSS: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)
        this.setLineupValidityAllowTiredStarters(team, tls, currentTeamPLSS.map( pls => pls.get({ plain: true})))

        tls.changed("lineups", true)
        tls.changed("hasValidLineup", true)


        //sign the player
        await this.offchainEventService.createFreeAgentTransferEvent(team._id, player._id, offChainEventTransactionId, options)

        //transfer diamonds
        await this.offchainEventService.createTeamBurnEvent(team._id, askingPrice, offChainEventTransactionId, options)

        await this.teamLeagueSeasonService.put(tls, options)


    }    

    async updateSeasonRecord(team:Team, season:Season, tls:TeamLeagueSeason, options?:any) : Promise<OverallRecord> {

        let result = await this.getOverallRecordBySeason(team, season, options)

        tls.overallRecord = JSON.parse(JSON.stringify(result.overallRecord))
        tls.changed("overallRecord", true)

        return tls.overallRecord

    }

    

}


interface TeamViewModel {

    team: {
        _id: string
        logoId:string
        name: string
        leagueRank: number
        overallRank: number
        colors:Colors
        abbrev: string
        city: City
        stadium: Stadium
        
        rank?: number
        seasonRating?: Rating
        longTermRating?: Rating
        lineups?: Lineup[]
        overallRecord?: {
            wins: number
            losses: number
        }
        fanInterestLongTerm: number
        fanInterestShortTerm: number
        winPercent?: number
        hasValidLineup?: boolean

        financeSeason: FinanceSeason
        // seasonHistory: SeasonHistory[]
        // teamCost

        diamondBalance:string,

        owner?: {
            _id: string
            discordId?:string
            discordUsername?:string
        }

        isQueued:boolean
        minimumPlayerSalary:string
        yesterdaysRewards:string
    }

    players?: PlayerRowViewModel[]
    completedGames?
    inProgressGame?
    // todaysGames?
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
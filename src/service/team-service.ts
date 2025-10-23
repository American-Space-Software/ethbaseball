import { inject, injectable } from "inversify";

import { Colors, DiamondMintPass, FinanceSeason, Lineup, RotationPitcher, Team } from "../dto/team.js";
import { TeamRepository } from "../repository/team-repository.js";
import { Owner } from "../dto/owner.js";
import { Image } from "../dto/image.js";

import { Player } from "../dto/player.js";
import { NFTMetadata, PlayerRowViewModel, PlayerService } from "./player-service.js";
import { City } from "../dto/city.js";
import { ContractType, ContractYear, MAX_AAV_CONTRACT, MIN_AAV_CONTRACT, Position, Rating, TeamInfo, TEAMS_PER_TIER } from "./enums.js";
import { TeamRating, TeamRecord } from "../repository/node/team-repository-impl.js";
import { GameRepository } from "../repository/game-repository.js";
import { Game } from "../dto/game.js";
import dayjs from "dayjs";
import { Stadium } from "../dto/stadium.js";
import { League } from "../dto/league.js";
import { FinanceService } from "./finance-service.js";
import { Season } from "../dto/season.js";
import {  ethers, Wallet } from "ethers";
import { TeamLeagueSeason } from "../dto/team-league-season.js";
import { TeamLeagueSeasonService } from "./team-league-season-service.js";
import { PlayerLeagueSeason } from "../dto/player-league-season.js";
import { PlayerLeagueSeasonService } from "./player-league-season-service.js";
import { GameTransactionService } from "./game-transaction-service.js";
import { SignatureTokenRepository } from "../repository/signature-token-repository.js";
import { LineupService } from "./lineup-service.js";
import { LeagueService } from "./league-service.js";
import { RollService } from "./roll-service.js";
import { StatService } from "./stat-service.js";
import { GameTransaction } from "../dto/game-transaction.js";
import { OffchainEventService } from "./offchain-event-service.js";
import { DiamondMintPassService } from "./diamond-mint-pass-service.js";
import { GameService } from "./game-service.js";
import { User } from "../dto/user.js";

const MAX_ROSTER_SIZE = 13
const HIGHEST_CITY_POPULATION = 8804190

@injectable()
class TeamService {

    @inject("TeamRepository")
    private teamRepository: TeamRepository

    @inject("GameRepository")
    private gameRepository: GameRepository

    @inject("SignatureTokenRepository")
    private signatureTokenRepository:SignatureTokenRepository

    @inject("sequelize")
    private sequelize:Function

    constructor(
        private playerService: PlayerService,
        private teamLeagueSeasonService: TeamLeagueSeasonService,
        private playerLeagueSeasonService: PlayerLeagueSeasonService,
        private financeService: FinanceService,
        private gameTransactionService: GameTransactionService,
        private lineupService:LineupService,
        private leagueService:LeagueService,
        private rollService:RollService,
        private statService:StatService,
        private offchainEventService:OffchainEventService,
        private diamondMintPassService:DiamondMintPassService,
        private gameService:GameService
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

    async getByOwner(owner: Owner, options?: any): Promise<Team[]> {
        return this.teamRepository.getByOwner(owner, options)
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

    async getByTokenId(tokenId: number, options?: any): Promise<Team> {
        return this.teamRepository.getByTokenId(tokenId, options)
    }

    async getByTokenIds(_ids:number[], options?:any): Promise<Team[]> {
        return this.teamRepository.getByTokenIds(_ids, options)
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

    async addToLeagueSeason(team: Team, league: League, season: Season, options?: any) {
        return this.teamRepository.addToLeagueSeason(team, league, season, options)
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

    async getTeamViewModel(team: Team, season: Season, currentDate:Date, userOwner:User, options?: any): Promise<TeamViewModel> {

        let tlss: TeamLeagueSeason[] = await this.teamLeagueSeasonService.getByTeam(team, options)

        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)
        let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

        let t = tls.get({ plain: true })

        let nextStartDate = this.getNextStartDate(team)
        let nextStarter:RotationPitcher = this.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss, nextStartDate)

        let diamondMintPasses = await this.diamondMintPassService.getUnmintedByTokenId(team.tokenId, options)
        let diamondBalance = await this.offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId, options)

        let start = dayjs(currentDate).subtract(3, 'days').toDate()
        let end = dayjs(currentDate).add(3, 'days').toDate()

        let gameIds = await this.gameRepository.getIdsByTeamAndPeriod(team, start, end, options)
        let games = []

        if (gameIds?.length > 0) {
            games = await this.gameService.getByIds(gameIds, options)

            //Sort so it matches ids order
            games.sort(function(a,b) {
                return gameIds.indexOf( a._id ) - gameIds.indexOf( b._id )
            })

        }


        return {
            team: {
                _id: team._id,
                tokenId: team.tokenId,
                diamondBalance: diamondBalance,
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
                marketSizePercent: t.city.population / HIGHEST_CITY_POPULATION,
                hasValidLineup: t.hasValidLineup,
                leagueRank: t.league.rank,
                overallRank: t.overallRecord.rank + ((t.league.rank - 1) * TEAMS_PER_TIER),
                overallRecord: t.overallRecord,
                financeSeason: t.financeSeason,
                diamondMintPasses: diamondMintPasses,
                seasonHistory: tlss.map(tls => {

                    let t: TeamLeagueSeason = tls.get({ plain: true })

                    return {
                        overallRecord: t.overallRecord,
                        startDate: t.season?.startDate,
                        endDate: t.season?.endDate,
                        leagueRank: t.league.rank,
                        rating: t.seasonRating,
                        financeSeason: t.financeSeason
                    }
                }),
                owner: {
                    _id: team.ownerId,
                    discordId: userOwner?.discordId,
                    discordUsername: userOwner?.discordProfile?.username
                }
            },
            players: plss.map(pls => {

                let p: PlayerLeagueSeason = pls.get({ plain: true })

                let isNextStarter = p.player._id == nextStarter?._id


                let allYears = this.playerService.getAllContractYears(p.player)

                let futureContractYears = allYears.filter( y => dayjs(y.startDate).toDate() >= dayjs(season.startDate).toDate() || y.startDate == undefined)

                
                return {
                    _id: p.playerId,
                    salary: p.contractYear.salary,
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
                    lastGamePitched: p.player.lastGamePitched,

                    pitchRatings: p.pitchRatings,
                    hittingRatings: p.hittingRatings,

                    percentileRatings: p.percentileRatings,

                    careerStats: p.player.careerStats,
                    seasonStats: p.stats,
                    futureContractYears: futureContractYears,
                    isNextStarter: isNextStarter

                }
            }),
            games: games.map(g => { return this.createTeamGameViewModel(team, g) })
        }

    }

    async getBasicTeamViewModel(team: Team, season:Season, options?:any){

        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

        let tlsPlain = tls.get({ plain: true })

        return {
            _id: team._id,
            logoId: tlsPlain.logoId,
            tokenId: team.tokenId,
            name: team.name,
            colors: team.colors,
            abbrev: team.abbrev,
            city: tlsPlain.city,
            stadium: tlsPlain.stadium,
            leagueRank: tlsPlain.league.rank,
            ownerId: team.ownerId,
            overallRank: tls.overallRecord.rank + ((tlsPlain.league.rank - 1) * TEAMS_PER_TIER),
            overallRecord: tls.overallRecord,
            financeSeason: tls.financeSeason
        }

    }

    async getTeamGameTransactionsForSeason(team: Team, season: Season, options?: any): Promise<GameTransaction[]> {
        return
        // let gameIds = await this.gameTransactionService.get

        // if (gameIds.length == 0) return []

        // return this.getTeamGameViewModelsById(team, gameIds, options)

    }


    async getTeamGameLogViewModels(team: Team, start: Date, end: Date, options?: any): Promise<TeamGame[]> {

        let gameIds = await this.gameRepository.getIdsByTeamAndPeriod(team, start, end, options)

        if (gameIds.length == 0) return []

        return this.getTeamGameViewModelsById(team, gameIds, options)

    }

    private async getTeamGameViewModelsById(team, gameIds, options?: any) {

        let games: Game[] = await this.gameRepository.getByIds(gameIds, options)

        //Sort so it matches ids order
        games.sort(function (a, b) {
            return gameIds.indexOf(a._id) - gameIds.indexOf(b._id)
        })

        return games.map(g => { return this.createTeamGameViewModel(team, g) })
    }

    createTeamGameViewModel(team: Team, g: Game) {

        let teamInfo = [g.home, g.away].find( t => t._id == team._id)
        let oppTeamInfo = [g.home, g.away].find( t => t._id != team._id)

        let teamFinances = g.home._id == team._id ? g.gameFinances?.home : g.gameFinances?.away
        let oppFinances = g.home._id == team._id ? g.gameFinances?.away : g.gameFinances?.home

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
                tokenId: teamInfo.tokenId,
                abbrev: teamInfo.abbrev,
                name: teamInfo.name,
                ratingBefore: teamInfo.seasonRating.before,
                ratingAfter: teamInfo.seasonRating.after,
                wins: g.isComplete ? teamInfo.overallRecord.after?.wins : teamInfo.overallRecord.before?.wins,
                losses: g.isComplete ? teamInfo.overallRecord.after?.losses : teamInfo.overallRecord.before?.losses,
                runs: g.home._id == team._id ? g.score.home : g.score.away,
                isWinner: g.winningTeamId == teamInfo._id,
                isHome: g.home._id == teamInfo._id,
                cityName: teamInfo.cityName,
                finances: teamFinances
            },
            opp: {
                _id: oppTeamInfo._id,
                tokenId: oppTeamInfo.tokenId,
                abbrev: oppTeamInfo.abbrev,
                name: oppTeamInfo.name,
                ratingBefore: oppTeamInfo.seasonRating.before,
                ratingAfter: oppTeamInfo.seasonRating.after,
                wins: g.isComplete ? oppTeamInfo.overallRecord.after?.wins : oppTeamInfo.overallRecord.before?.wins,
                losses: g.isComplete ? oppTeamInfo.overallRecord.after?.losses : oppTeamInfo.overallRecord.before?.losses,
                runs: g.home._id == team._id ? g.score.away : g.score.home,
                isWinner: g.winningTeamId == oppTeamInfo._id,
                isHome: g.home._id == oppTeamInfo._id,
                cityName: oppTeamInfo.cityName,
                finances: oppFinances
            }
        }
    }


    getTeamStandingsViewModel(tls:TeamLeagueSeason, rank:number) {
    
        let cost

        if (!tls.team.ownerId) {

            cost = this.getTeamCost(tls.financeSeason)

        } else {

            cost = {
                totalDiamonds: "0",
                ethCost: "0",
                ethCostDecimal: 0
            }
        }

        return {
            _id: tls.team._id,
            tokenId: tls.team.tokenId,
            logoId: tls.logoId,
            name: tls.team.name,
            abbrev: tls.team.abbrev,
            city: tls.city,
            // stadium: t.stadium,
            ownerId: tls.team.ownerId,
            seasonRating: tls.seasonRating,
            longTermRating: tls.longTermRating,
            rank: rank,
            fanInterestShortTerm: tls.fanInterestShortTerm,
            fanInterestLongTerm: tls.fanInterestLongTerm,
            marketSizePercent: tls.city.population / HIGHEST_CITY_POPULATION,
            hasValidLineup: tls.hasValidLineup,
            overallRecord: tls.overallRecord,
            financeSeason: tls.financeSeason,
            financeSeasonDecimal: {

                diamondBalance: parseFloat(ethers.formatUnits(tls.financeSeason.diamondBalance, "ether")),
                revenue: parseFloat(ethers.formatUnits(tls.financeSeason.revenue.seasonToDate.total, "ether")),
                expenses: parseFloat(ethers.formatUnits(tls.financeSeason.expenses.seasonToDate.total, "ether")),
                profit: parseFloat(ethers.formatUnits(tls.financeSeason.profit.seasonToDate.total, "ether")),

                projectedTotalRevenue: parseFloat(ethers.formatUnits(tls.financeSeason.revenue.projectedTotal.total, "ether")),
                projectedTotalExpenses: parseFloat(ethers.formatUnits(tls.financeSeason.expenses.projectedTotal.total, "ether")),
                projectedTotalProfit: parseFloat(ethers.formatUnits(tls.financeSeason.profit.projectedTotal.total, "ether"))

            },
            teamCost: cost
        }


    }

    async getStandingsViewModel(seasons: Season[], leagues:League[], league: League, season: Season, options?: any) {

        let leagueVm 

        let teams: TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

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
            leagueFinance.expenses = (BigInt(leagueFinance.expenses) + BigInt(vm.financeSeason.expenses.seasonToDate.total)).toString()
            leagueFinance.profit = (BigInt(leagueFinance.profit) + BigInt(vm.financeSeason.profit.seasonToDate.total)).toString()

            leagueFinance.projectedTotalRevenue = (BigInt(leagueFinance.projectedTotalRevenue) + BigInt(vm.financeSeason.revenue.projectedTotal.total)).toString()
            leagueFinance.projectedTotalExpenses = (BigInt(leagueFinance.projectedTotalExpenses) + BigInt(vm.financeSeason.expenses.projectedTotal.total)).toString()
            leagueFinance.projectedTotalProfit = (BigInt(leagueFinance.projectedTotalProfit) + BigInt(vm.financeSeason.profit.projectedTotal.total)).toString()

            if (vm.teamCost) {
                leagueFinance.teamCostETH = (BigInt(leagueFinance.teamCostETH) + BigInt(vm.teamCost.ethCost )).toString()
                leagueFinance.teamCostDiamonds = (BigInt(leagueFinance.teamCostDiamonds) + BigInt(vm.teamCost.totalDiamonds )).toString()
            }
            
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


    // async listViewModels(seasons: Season[], leagues: League[], season: Season, options?: any) {

    //     let leagueVms = []

    //     for (let league of leagues) {

    //         let teams: TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

    //         let viewModels = teams.map((t, index) => {
    //             t = t.get({ plain: true })
    //             return this.getTeamStandingsViewModel(t, index + 1)
    //         })

    //         let leagueFinance = {
    //             cash: "0",
    //             revenue: "0",
    //             expenses: "0",
    //             profit: "0",
    //             teamCostETH: "0",
    //             teamCostDiamonds: "0",

    //             projectedTotalRevenue: "0",
    //             projectedTotalExpenses: "0",
    //             projectedTotalProfit: "0"
    //         }
    
    //         for (let vm of viewModels) {
    //             leagueFinance.cash = (BigInt(leagueFinance.cash) + BigInt(vm.financeSeason.diamondBalance)).toString()
    //             leagueFinance.revenue = (BigInt(leagueFinance.revenue) + BigInt(vm.financeSeason.revenue.seasonToDate.total)).toString()
    //             leagueFinance.expenses = (BigInt(leagueFinance.expenses) + BigInt(vm.financeSeason.expenses.seasonToDate.total)).toString()
    //             leagueFinance.profit = (BigInt(leagueFinance.profit) + BigInt(vm.financeSeason.profit.seasonToDate.total)).toString()

    //             leagueFinance.projectedTotalRevenue = (BigInt(leagueFinance.projectedTotalRevenue) + BigInt(vm.financeSeason.revenue.projectedTotal.total)).toString()
    //             leagueFinance.projectedTotalExpenses = (BigInt(leagueFinance.projectedTotalExpenses) + BigInt(vm.financeSeason.expenses.projectedTotal.total)).toString()
    //             leagueFinance.projectedTotalProfit = (BigInt(leagueFinance.projectedTotalProfit) + BigInt(vm.financeSeason.profit.projectedTotal.total)).toString()

    //             if (vm.teamCost) {
    //                 leagueFinance.teamCostETH = (BigInt(leagueFinance.teamCostETH) + BigInt(vm.teamCost.ethCost )).toString()
    //                 leagueFinance.teamCostDiamonds = (BigInt(leagueFinance.teamCostDiamonds) + BigInt(vm.teamCost.totalDiamonds )).toString()
    //             }
                
    //         }

    //         leagueVms.push({
    //             league: league,
    //             viewModels: viewModels,
    //             leagueFinance: leagueFinance
    //         })

    //     }

    //     let financeTotals = {
    //         cash: "0",
    //         expenses:  "0",
    //         profit:  "0",
    //         revenue: "0",
    //         projectedTotalRevenue: "0",
    //         projectedTotalExpenses: "0",
    //         projectedTotalProfit: "0"
    //       }

    //       for (let lf of leagueVms.map( l => l.leagueFinance)) {
    //         financeTotals.cash = (BigInt(financeTotals.cash) + BigInt(lf.cash)).toString()
    //         financeTotals.expenses = (BigInt(financeTotals.expenses) + BigInt(lf.expenses)).toString()
    //         financeTotals.profit = (BigInt(financeTotals.profit) + BigInt(lf.profit)).toString()
    //         financeTotals.revenue = (BigInt(financeTotals.revenue) + BigInt(lf.revenue)).toString()
    //         financeTotals.projectedTotalRevenue = (BigInt(financeTotals.projectedTotalRevenue) + BigInt(lf.projectedTotalRevenue)).toString()
    //         financeTotals.projectedTotalExpenses = (BigInt(financeTotals.projectedTotalExpenses) + BigInt(lf.projectedTotalExpenses)).toString()
    //         financeTotals.projectedTotalProfit = (BigInt(financeTotals.projectedTotalProfit) + BigInt(lf.projectedTotalProfit)).toString()

    //       }


    //     return {
    //         season: season,
    //         seasons: seasons.map(s => {
    //             return {
    //                 _id: s._id,
    //                 startDate: dayjs(s.startDate).format("YYYY-MM-DD")
    //             }
    //         }),
    //         leagueVms: leagueVms,
    //         financeTotals: financeTotals
    //     }

    // }

    async listBasicViewModels(leagues: League[], season: Season, options?: any) {

        let leagueVms = []

        for (let league of leagues) {

            let teams: TeamLeagueSeason[] = await this.teamLeagueSeasonService.listByLeagueAndSeason(league, season, options)

            let teamViewModels = teams.map((t, index) => {
                t = t.get({ plain: true })

                return {
                    tokenId: t.team.tokenId,
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


    async count(options?: any): Promise<number> {
        return this.teamRepository.count(options)
    }

    async countByLeague(league: League, options?: any): Promise<number> {
        return this.teamRepository.countByLeague(league, options)
    }

    validateRoster(team: Team, players: Player[]) {

        //Make sure there's the right number of players
        if (players.length > MAX_ROSTER_SIZE) {
            throw new Error(`Roster must have ${MAX_ROSTER_SIZE} players.`)
        }

        //Make sure they're owned by the right owner and eligible
        for (let player of players) {

            if (player.ownerId != team.ownerId) {
                throw new Error(`Can not add unowned player to team roster.`)
            }

        }

    }

    validateLineups(team:Team, tls: TeamLeagueSeason, plss: PlayerLeagueSeason[], gameDate: Date) {

        tls.hasValidLineup = false

        for (let lineup of tls.lineups) {

            let startingPitcher: RotationPitcher = this.getStartingPitcherFromPLS(lineup.rotation, plss, gameDate)

            this.validateLineup(team, lineup, plss, startingPitcher, gameDate)

            if (lineup.valid == true) {
                tls.hasValidLineup = true
            }
        }

    }

    validateLineup(team: Team, lineup: Lineup, plss: PlayerLeagueSeason[], startingPitcher: RotationPitcher, gameDate: Date) {

        lineup.valid = false

        //Make sure there are 9 spots in the order and 5 spots in the rotation
        if (lineup.order.length != 9) {
            throw new Error("Lineup must have 9 players.")
        }

        if (lineup.rotation.length != 5) {
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
            throw new Error(`No valid starting pitcher for ${dayjs(gameDate).format('YYYY-MM-DD')}`)
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

    async getEligibleTeams(options?: any): Promise<Team[]> {
        return this.teamRepository.getEligibleTeams(options)
    }

    getStartingPitcher(players:Player[], startDate: Date): RotationPitcher {

        //Loop through rotation and grab first listed pitcher that's eligible to play
        let compareDate = dayjs(startDate).subtract(4, 'days').toDate()
        compareDate.setHours(0, 0, 0)

        let startingPitcher: RotationPitcher

        for (let player of players) {

            if (player.lastGamePitched == undefined || player.lastGamePitched <= compareDate) {
                startingPitcher = {
                    _id: player._id,
                    stamina: 1
                }
                break
            }
        }

        if (!startingPitcher) {

            let player = players[0]

            startingPitcher = {
                _id: player._id,
                stamina: .5
            }

        } 

        return startingPitcher
    }

    getStartingPitcherFromPLS(rotation: RotationPitcher[], plss: PlayerLeagueSeason[], startDate: Date): RotationPitcher {

        //Loop through rotation and grab first listed pitcher that's eligible to play
        let compareDate = dayjs(startDate).subtract(4, 'days').toDate()
        compareDate.setHours(0, 0, 0)

        let startingPitcher: RotationPitcher

        for (let pitcher of rotation) {

            let pls = plss.find(p => p.playerId == pitcher._id)

            if (!pls) continue

            let player

            if (pls.player) {
                player = pls.player
            } else {
                let plsPlain = pls.get({ plain: true })
                player = plsPlain.player
            }
            

            if (player.lastGamePitched == undefined || player.lastGamePitched <= compareDate) {
                startingPitcher = JSON.parse(JSON.stringify(pitcher))
                startingPitcher.stamina = 1
                break
            }
        }

        if (!startingPitcher) {
            startingPitcher = JSON.parse(JSON.stringify(rotation[0]))
            startingPitcher.stamina = .5
        } 

        return startingPitcher
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


        //Update team
        let nextStartDate = this.getNextStartDate(options)

        currentTLS.lineups = lineups
        currentTLS.changed('lineups', true)

        await this.validateLineups(team, currentTLS, currentPLSPlain, nextStartDate)

        await this.teamLeagueSeasonService.put(currentTLS, options)
    }

    async signAvailablePlayer(league:League, team:Team, player:Player, pls:PlayerLeagueSeason, tls: TeamLeagueSeason, season: Season, date: Date, options?: any) {

        this.playerService.signContract(league, player, season, date)

        this.financeService.signContract(tls, pls, player, season, date)

        pls.leagueId = tls.leagueId
        pls.teamId = tls.teamId
        pls.leagueId = tls.leagueId
        pls.askingPrice = null


        await this.gameTransactionService.signPlayer(league, team, season, player, player.contract, date, options)


        await this.playerLeagueSeasonService.put(pls, options)
        await this.playerService.put(player, options)

    }

    getMaxSalaryOffer(financeSeason: FinanceSeason, spotsToFill: number, rookieSalary:number): number {

        let maxSalary = 0

        let gamesPerSeason = financeSeason.totalGamesPlayed + financeSeason.totalGamesRemaining
        let gamesRemaining = financeSeason.homeGamesRemaining + financeSeason.awayGamesRemaining

        let diamondsForFreeAgents = (BigInt(financeSeason.profit.projectedRemaining.total) * 7n) / 10n //90%


        //Calculate the max total money this team could spend on payroll.
        let diamondsToSpendPerGame = BigInt(0)

        if (gamesRemaining > 0) {
            diamondsToSpendPerGame = diamondsForFreeAgents / BigInt(gamesRemaining)
        }

        let diamondsToSpendPerGameNumber = parseFloat(ethers.formatUnits(diamondsToSpendPerGame, 'ether'))

        //So we can afford a player who's yearly salary is that amount per game.
        maxSalary = (diamondsToSpendPerGameNumber * gamesPerSeason) - ((spotsToFill - 1) * rookieSalary)

        if (maxSalary > MAX_AAV_CONTRACT) maxSalary = MAX_AAV_CONTRACT
        if (maxSalary < rookieSalary) maxSalary = rookieSalary

        return maxSalary

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

    async fillAndValidateRoster(league:League, team:Team, tls: TeamLeagueSeason, roster: PlayerLeagueSeason[], season: Season, date: Date, minimumOnly: boolean, options?: any) {

        //Remove unrostered players from the lineup and rotation. Shouldn't be here...but they are sometimes.
        // for (let spot of tls.lineups[0].order) {
        //     if (!roster.map( p => p.playerId).includes(spot._id)) {
        //         delete spot._id
        //         if (spot.position != Position.PITCHER) {
        //             delete spot.position
        //         }
        //     }
        // }

        // for (let spot of tls.lineups[0].rotation) {
        //     if (!roster.map( p => p.playerId).includes(spot._id)) {
        //         delete spot._id
        //     }
        // }

        // //Force spot 9 to be the pitcher without an ID
        // tls.lineups[0].order[8]= {
        //     position: Position.PITCHER
        // }


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

        const updateFinances = async (team, season, options) => {

            let updatedRoster:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)

            //Recalculate finances.
            let tlsPlain = tls.get({ plain: true })
            let projectedPayrollTotal = this.financeService.calculateProjectedPayroll(updatedRoster.map(r => r.get({ plain: true })))
            this.financeService.setFinancialProjections(tls, tlsPlain.league, tlsPlain.city, tlsPlain.stadium, projectedPayrollTotal)

        }


        for (let position of shuffled) {

            let rookieSalary = this.playerService.getRookieSalary(league.rank)

            //Find a player from the pool that fits via salary.
            let maxSalary = this.getMaxSalaryOffer(tls.financeSeason, shuffled.length - fillCount, rookieSalary)
            let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getFreeAgentsByPositionAndSalary(position, season, maxSalary, 1, 0, options)


            let pls: PlayerLeagueSeason
            let player: Player

            if (minimumOnly || plss?.length < 1) {

                //Generate a player.
                player = await this.playerService.scoutPlayer({ onDate: dayjs(date).format("YYYY-MM-DD"), type: position})

                this.playerService.createRookieContract(player)
                await this.playerService.put(player, options)

                //Fetch again so we have tokenId
                player = await this.playerService.get(player._id, options)

                pls = await this.playerLeagueSeasonService.createPlayerLeagueSeason(player, season, 1, options)

            } else {

                pls = await this.playerLeagueSeasonService.getById(plss[0]._id, options)
                player = await this.playerService.get(plss[0].playerId, options)

            }


            //Sign a player from the player pool.
            await this.signAvailablePlayer(league, team, player, pls, tls, season, date, options)

            added.players.push(player)
            added.plss.push(pls)

            //Update finances.
            await updateFinances(team, season, options)

            fillCount++

        }

        if (shuffled?.length > 0) {
            
            await updateFinances(team, season, options)

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

    async getMintInfo(ownerId:string, team:Team, season:Season, mintKey?:string) : Promise<TokenMintInfo> {
        
        let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season)

        //Buying with Diamonds, reserved.
        if (team.mintKey) {

            if (team.mintKey == mintKey) {
                return {
                    diamonds: await this.getBuyWithDiamondsMintInfo(tls, team, ownerId, "0")
                }
            } else {
                return {
                    error: "Missing mint key."
                }
            }

        } else {

            return {
                //MINT: Buying with ETH, not reserved.
                eth: await this.getBuyWithETHMintInfo(tls, team, ownerId),
                //MINT_DIAMONDS: Minting with Diamonds, not reserved.
                diamonds: await this.getBuyWithDiamondsMintInfo(tls, team, ownerId)
                //FORCLOSURE: Forclosure...maybe later
            }

        }

    }

    async getBuyWithETHMintInfo(tls:TeamLeagueSeason, team:Team, ownerId:string) {

        let cost = this.getTeamCost(tls.financeSeason)

        return {
            revenueWithMultiplier: cost.revenueWithMultiplier,
            to:ownerId,
            tokenId: team.tokenId,
            ethCost: cost.ethCost,
        }
    }

    async getForeclosureETHMintInfo(tls:TeamLeagueSeason, team:Team, ownerId:string) {

        let cost = this.getTeamCost(tls.financeSeason)

        return {
            revenueWithMultiplier: cost.revenueWithMultiplier,
            totalDiamonds: cost.totalDiamonds,
            to:ownerId,
            tokenId: team.tokenId,
            ethCost: cost.ethCost
        }
    }

    async getBuyWithDiamondsMintInfo(tls:TeamLeagueSeason, team:Team, ownerId:string, totalOverride?:string) {

        let cost = this.getTeamCost(tls.financeSeason)

        let totalDiamonds = totalOverride ? totalOverride : cost.totalDiamonds

        return {
            revenueWithMultiplier: cost.revenueWithMultiplier,
            totalDiamonds: totalDiamonds,
            to:ownerId,
            tokenId: team.tokenId
        }
    }

    async dropPlayerWithSignature(pls:PlayerLeagueSeason, player:Player, team:Team, season:Season, date:Date, message:string, signature:string) {

        let s = await this.sequelize()
        await s.transaction(async (t1) => {
        
            let options = { transaction: t1 }


            //Check if it has a valid signature.
            const recoveredAddress = ethers.verifyMessage(message, signature)

            if (!ethers.isAddress(recoveredAddress) || recoveredAddress != team.ownerId) {
                throw new Error("Invalid signature.")
            }

            const token = message.slice(message.indexOf("@") + 1).trim()

            let tokenKey = `drop-${player._id}-${recoveredAddress}`

            let signatureToken = await this.signatureTokenRepository.get(tokenKey, options)

            if (token != signatureToken.token || signatureToken.expires < new Date(new Date().toUTCString())) {
                throw new Error("Invalid signature token.")
            }

            //Update team. Remove from lineup and rotation.
            let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

            //Make sure they can afford to drop player.
            let gamesPerSeason = tls.financeSeason.totalGamesPlayed + tls.financeSeason.totalGamesRemaining
            let gamesRemaining = tls.financeSeason.homeGamesRemaining + tls.financeSeason.awayGamesRemaining

            let costToDrop = this.playerService.getCostToDrop(player, gamesPerSeason, gamesRemaining)

            let teamDiamondBalance = await this.offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId)


            if (BigInt(costToDrop) > BigInt(teamDiamondBalance)) {
                throw new Error("Insufficient funds to drop.")
            }


            let tlsPlain:TeamLeagueSeason = tls.get({ plain: true })

            this.lineupService.lineupRemove(tls.lineups[0], player._id)
            this.lineupService.rotationRemove(tls.lineups[0], player._id)

            tls.changed("lineups", true)



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
            nextPLS.startDate = date
            nextPLS.endDate = season.endDate
            nextPLS.age = player.age

            nextPLS.stats = {
                //@ts-ignore
                hitting: this.statService.mergeHitResultsToStatLine({}, {}),
                //@ts-ignore
                pitching: this.statService.mergePitchResultsToStatLine({}, {})
            }

            if (player.contract.isRookie) {

                let contractYear:ContractYear = player.contract.years.find(y => y.startDate == dayjs(season.startDate).format("YYYY-MM-DD"))
            
                if (contractYear?.salary) {
                    nextPLS.askingPrice = parseFloat(ethers.formatUnits(contractYear.salary, "ether")) 
                }

            } else {

                //If they are not on a rookie deal we need to generate a free agent contract for them.
                let league:League = await this.leagueService.getByRank(1, options)

                let highestLeaguePLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByLeagueSeason(league, season, options)
                let laPlayerRating = this.rollService.getArrayAvg(highestLeaguePLS.map( p => p.overallRating))
                let laSalary = this.rollService.getArrayAvg(highestLeaguePLS.map( p => parseFloat(ethers.formatUnits(p.contractYear.salary))))

                this.playerService.createFreeAgentContract(player, laPlayerRating, laSalary, 7, 30)
                nextPLS.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 

            }

            await this.playerLeagueSeasonService.put(nextPLS, options)

            //drop the player
            await this.gameTransactionService.dropPlayer(tlsPlain.league, team, season, player, date, options, { message, signature })


            //Get updated player list for team
            let teamPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)
            let teamPLSPlain = teamPLS.map( tls => tls.get({ plain: true }))

            //Update team finances
            this.financeService.setFinancialProjections(tls, tlsPlain.league, tlsPlain.city, tlsPlain.stadium, this.financeService.calculateProjectedPayroll(teamPLSPlain))

            await this.offchainEventService.createTeamBurnEvent(team.tokenId, `-${costToDrop}`, undefined, options)

            let diamondBalance = await this.offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId, options)

            tls.financeSeason.diamondBalance = diamondBalance

            await this.put(team, options)
            await this.teamLeagueSeasonService.put(tls, options)

        })


    }

    async dropPlayer(pls:PlayerLeagueSeason, player:Player, team:Team, season:Season, date:Date) {

        let s = await this.sequelize()
        await s.transaction(async (t1) => {
        
            let options = { transaction: t1 }

            //Update team. Remove from lineup and rotation.
            let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season, options)

            //Make sure they can afford to drop player.
            let gamesPerSeason = tls.financeSeason.totalGamesPlayed + tls.financeSeason.totalGamesRemaining
            let gamesRemaining = tls.financeSeason.homeGamesRemaining + tls.financeSeason.awayGamesRemaining

            let costToDrop = this.playerService.getCostToDrop(player, gamesPerSeason, gamesRemaining)

            let teamDiamondBalance = await this.offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId)


            if (BigInt(costToDrop) > BigInt(teamDiamondBalance)) {
                throw new Error("Insufficient funds to drop.")
            }


            let tlsPlain:TeamLeagueSeason = tls.get({ plain: true })

            this.lineupService.lineupRemove(tls.lineups[0], player._id)
            this.lineupService.rotationRemove(tls.lineups[0], player._id)

            tls.changed("lineups", true)



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
            nextPLS.startDate = date
            nextPLS.endDate = season.endDate
            nextPLS.age = player.age

            nextPLS.stats = {
                //@ts-ignore
                hitting: this.statService.mergeHitResultsToStatLine({}, {}),
                //@ts-ignore
                pitching: this.statService.mergePitchResultsToStatLine({}, {})
            }

            if (player.contract.isRookie) {

                let contractYear:ContractYear = player.contract.years.find(y => y.startDate == dayjs(season.startDate).format("YYYY-MM-DD"))
            
                if (contractYear?.salary) {
                    nextPLS.askingPrice = parseFloat(ethers.formatUnits(contractYear.salary, "ether")) 
                }

            } else {

                //If they are not on a rookie deal we need to generate a free agent contract for them.
                let league:League = await this.leagueService.getByRank(1, options)

                let highestLeaguePLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByLeagueSeason(league, season, options)
                let laPlayerRating = this.rollService.getArrayAvg(highestLeaguePLS.map( p => p.overallRating))
                let laSalary = this.rollService.getArrayAvg(highestLeaguePLS.map( p => parseFloat(ethers.formatUnits(p.contractYear.salary))))

                this.playerService.createFreeAgentContract(player, laPlayerRating, laSalary, 7, 30)
                nextPLS.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary, "ether")) 

            }

            await this.playerLeagueSeasonService.put(nextPLS, options)

            //drop the player
            await this.gameTransactionService.dropPlayer(tlsPlain.league, team, season, player, date, options)


            //Get updated player list for team
            let teamPLS:PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season, options)
            let teamPLSPlain = teamPLS.map( tls => tls.get({ plain: true }))

            //Update team finances
            this.financeService.setFinancialProjections(tls, tlsPlain.league, tlsPlain.city, tlsPlain.stadium, this.financeService.calculateProjectedPayroll(teamPLSPlain))

            await this.offchainEventService.createTeamBurnEvent(team.tokenId, `-${costToDrop}`, undefined, options)

            let diamondBalance = await this.offchainEventService.getBalanceForTokenId(ContractType.DIAMONDS, team.tokenId, options)

            tls.financeSeason.diamondBalance = diamondBalance

            await this.put(team, options)
            await this.teamLeagueSeasonService.put(tls, options)

        })


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


        let startingPitcher: RotationPitcher = this.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss, date)
        this.validateLineup(team, tls.lineups[0], plss, startingPitcher, date)

        if (originalLineup != tls.lineups[0]) {
            tls.changed("lineups", true)
        }

    }

    createNFTMetadata(city:City, team: Team, imagePath:string) {

        let result: NFTMetadata = {
            tokenId: team.tokenId,
            name: `${city.name} ${team.name}`,
            description: ''
        }

        result.image = `ipfs://${imagePath}`

        result.attributes = [
            {
                trait_type: "Token ID",
                value: team.tokenId.toString()
            },
            {
                trait_type: "City",
                value: city.name
            },
            {
                trait_type: "Name",
                value: team.name
            }
            
        ]



        return result

    }

    async changeName(team:Team, options?:any) {

        //Change name on team.

        //Change name on current TLS. 

        //Update all future scheduled games with new name.

    }

}

interface TokenMintInfo {
    error?:string
    eth?:MintInfo
    diamonds?:MintInfo
}

interface MintInfo {

    revenueWithMultiplier: string,
    totalDiamonds?: string

    tokenId:number
    ethCost?:string
}

interface TeamViewModel {

    team: {
        _id: string
        tokenId:number
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
        marketSizePercent: number
        winPercent?: number
        hasValidLineup?: boolean

        financeSeason: FinanceSeason
        seasonHistory: SeasonHistory[]
        // teamCost

        diamondMintPasses: DiamondMintPass[]
        diamondBalance:string,

        owner?: {
            _id: string
            discordId?:string
            discordUsername?:string
        }
    }

    players?: PlayerRowViewModel[]
    games?
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
        ratingBefore: number
        ratingAfter: number
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
        ratingBefore: number
        ratingAfter: number
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
import { inject, injectable } from "inversify";

import { Team } from "../dto/team.js";

import { Player } from "../dto/player.js";

import { FinanceSeason, GameTeamFinance, LEASE_PER_CAPACITY, Position, Revenue, RewardPerTeam} from "./enums.js";

import { LineupService } from "./lineup-service.js";
import { ethers } from "ethers";
import { RollChartService } from "./roll-chart-service.js";
import { Season } from "../dto/season.js";
import { TeamLeagueSeason } from "../dto/team-league-season.js";
import { PlayerLeagueSeason } from "../dto/player-league-season.js";
import { League } from "../dto/league.js";
import { Stadium } from "../dto/stadium.js";
import { City } from "../dto/city.js";


const MIN_TICKET_PRICE = 1
const AVG_TICKET_PRICE = 10
const MAX_TICKET_PRICE = 75

const AVG_VIEWER_WORTH = .15


const MIN_SEASON_TICKET_PERCENT = .1
const AVG_SEASON_TICKET_PERCENT = .35
const MAX_SEASON_TICKET_PERCENT = .75

const MIN_GATE_TICKET_PERCENT = .25
const AVG_GATE_TICKET_PERCENT = .45
const MAX_GATE_TICKET_PERCENT = .75


const MIN_LOCAL_VIEWERSHIP_PERCENT = .1
const AVG_LOCAL_VIEWERSHIP_PERCENT = .17
const MAX_LOCAL_VIEWERSHIP_PERCENT = .35

const TOTAL_NATIONAL_MEDIA_REVENUE_PER_GAME = 150000 //150,000 per game
const AVG_LOCAL_MEDIA_REVENUE_PER_GAME = 65000 //65,000 per game
const MAX_LOCAL_MEDIA_REVENUE_PER_GAME = 225000 //65,000 per game

@injectable()
class FinanceService {

    constructor(
        private rollChartService:RollChartService,
        private lineupService:LineupService,
        @inject("getFees") private fees:Function
    ) {}

    signContract(tls:TeamLeagueSeason, pls:PlayerLeagueSeason, player:Player, season:Season, date:Date) {

        // pls.contractYear = player.contract.years[0]
        // pls.changed("contractYear", true)

        if (player.primaryPosition == Position.PITCHER) {

            let rotationIndex = this.lineupService.getFirstAvailableRotationSpot(tls.lineups[0])
            this.lineupService.rotationAdd(tls.lineups[0], player, rotationIndex)
            
        } else {

            let lineupIndex = this.lineupService.getFirstAvailableOrderSpot(tls.lineups[0])
            this.lineupService.lineupAdd(tls.lineups[0], player, lineupIndex)
        }

        tls.changed('lineups', true)

    }

    updateFinanceSeason(financeSeason:FinanceSeason, gameTeamFinance:GameTeamFinance) {

        // financeSeason.revenue.seasonToDate.gate = (BigInt(financeSeason.revenue.seasonToDate.gate) + BigInt(gameTeamFinance.gateTicketRevenue)).toString()
        // financeSeason.revenue.seasonToDate.localMedia = (BigInt(financeSeason.revenue.seasonToDate.localMedia) + BigInt(gameTeamFinance.localTvRevenue)).toString()
        // financeSeason.revenue.seasonToDate.nationalMedia = (BigInt(financeSeason.revenue.seasonToDate.nationalMedia) + BigInt(gameTeamFinance.nationalTvRevenue)).toString()
        // financeSeason.revenue.seasonToDate.seasonTickets = (BigInt(financeSeason.revenue.seasonToDate.seasonTickets) + BigInt(gameTeamFinance.seasonTicketRevenue)).toString()
        financeSeason.revenue.seasonToDate.total = (BigInt(financeSeason.revenue.seasonToDate.total) + 
                                                   BigInt(gameTeamFinance.totalRevenue)).toString()
        financeSeason.revenue.seasonToDate.perGame = BigInt(financeSeason.totalGamesPlayed) > 0 ? (BigInt(financeSeason.revenue.seasonToDate.total) / BigInt(financeSeason.totalGamesPlayed)).toString() : BigInt(0).toString()


    }

    setFinancialProjections(
                          tls:TeamLeagueSeason
                        ) {


        //Set projected revenue remaining
        tls.financeSeason.revenue.projectedRemaining.total = BigInt(0).toString() //this.calculateTotalRevenue(tls.financeSeason.revenue.projectedRemaining).toString()


        //And totals
        tls.financeSeason.revenue.projectedTotal.total = BigInt(0).toString() //this.calculateTotalRevenue(tls.financeSeason.revenue.projectedTotal).toString()
                    
        tls.changed('financeSeason', true)

    }


    calculateTotalFanInterest(tls:TeamLeagueSeason) {
        return tls.fanInterestShortTerm * .5 + tls.fanInterestLongTerm * .5
    }

    calculateTicketPrice(leagueRank:number, fanInterestShortTerm:number, fanInterestLongTerm:number, cityPopulation:number, stadiumCapacity:number) : bigint {

        let demandChange = this.getDemandChange(leagueRank,fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity)

        let avgPrice = this.rollChartService.applyChange(AVG_TICKET_PRICE, demandChange)

        if (avgPrice < MIN_TICKET_PRICE) avgPrice = MIN_TICKET_PRICE
        if (avgPrice > MAX_TICKET_PRICE) avgPrice = MAX_TICKET_PRICE

        return ethers.parseUnits( avgPrice.toString()  , 'ether')

    }

    getDemandChange(leagueRank:number, fanInterestShortTerm:number, fanInterestLongTerm:number, cityPopulation:number, stadiumCapacity:number) {

        // Combine inputs to calculate ticket price
        let leagueRankFactor = 1

        Array.from({ length: leagueRank - 1 }, () => {
            leagueRankFactor *= .5
        })    
        
        const interestFactor = (fanInterestShortTerm + fanInterestLongTerm) / 2 
        const populationFactor = (cityPopulation / stadiumCapacity) * .1 

        
        //Is there more or less demand than average?
        return this.rollChartService.getChange(1, (1 * leagueRankFactor * interestFactor * populationFactor))

    }

    calculateSeasonTicketSales(leagueRank:number, fanInterestShortTerm:number, fanInterestLongTerm:number, cityPopulation:number, stadiumCapacity:number) : number {

        //Is there more or less demand than average?
        let demandChange = this.getDemandChange(leagueRank, fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity)

        let seasonTicketPercent = this.rollChartService.applyChange(AVG_SEASON_TICKET_PERCENT, demandChange)

        if (seasonTicketPercent < MIN_SEASON_TICKET_PERCENT) seasonTicketPercent = MIN_SEASON_TICKET_PERCENT
        if (seasonTicketPercent > MAX_SEASON_TICKET_PERCENT) seasonTicketPercent = MAX_SEASON_TICKET_PERCENT

        let ticketsSold = Math.floor(seasonTicketPercent * stadiumCapacity)

        if (ticketsSold < 0) {
            throw new Error("Season ticket sales can not be negative.")
        }

        if (ticketsSold > stadiumCapacity) {
            throw new Error("Season ticket sales can not be more than stadium capacity.")
        }


        return ticketsSold

    }

    calculateGateRevenuePerGame(ticketPrice: bigint, tickets:number) : bigint {
        return ticketPrice * BigInt(tickets)
    }

    calculateSeasonTicketRevenuePerGame(ticketPrice:bigint,  tickets:number) : bigint {
        return ticketPrice * BigInt(tickets)
    }

    calculateSingleGameTicketSales(leagueRank:number, fanInterestShortTerm:number, fanInterestLongTerm:number, cityPopulation:number, stadiumCapacity:number, seasonTicketsSold:number) : number {

        let availableTickets = stadiumCapacity - seasonTicketsSold

        if (availableTickets < 0) {
            throw new Error("Available tickets can not be negative.")
        }

        let minTicketsSold = Math.floor(MIN_GATE_TICKET_PERCENT * stadiumCapacity)
        let maxTicketsSold = Math.min(availableTickets, Math.floor(MAX_GATE_TICKET_PERCENT * stadiumCapacity))

        let demandChange = this.getDemandChange(leagueRank, fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity)

        let gateTicketsPercent = this.rollChartService.applyChange(AVG_GATE_TICKET_PERCENT, demandChange)

        if (gateTicketsPercent < MIN_GATE_TICKET_PERCENT) gateTicketsPercent = MIN_GATE_TICKET_PERCENT
        if (gateTicketsPercent > MAX_GATE_TICKET_PERCENT) gateTicketsPercent = MAX_GATE_TICKET_PERCENT


        let ticketsSold = Math.floor(gateTicketsPercent * stadiumCapacity)

        if (ticketsSold < minTicketsSold) ticketsSold = minTicketsSold 
        if (ticketsSold > maxTicketsSold) ticketsSold = maxTicketsSold

        if (ticketsSold < 0) {
            throw new Error("Ticket sales can not be negative.")
        }

        return ticketsSold
        
    }

    getLeagueRankModifier(leagueRank:number) {

        let leagueRankModifier = 1

        Array.from({ length: leagueRank - 1 }, () => {
            leagueRankModifier *= .5
        })    

        return leagueRankModifier
    }

    calculateTotalRevenue(revenue:Revenue) {
        return BigInt(revenue.total)//BigInt(revenue.gate) + BigInt(revenue.localMedia) + BigInt(revenue.nationalMedia) + BigInt(revenue.seasonTickets)
    }

    getDefaultFinanceSeason() {

        return {

            diamondBalance: "0",

            homeGamesPlayed: 0,

            awayGamesPlayed: 0,

            totalGamesPlayed: 0,

            revenue: {
                seasonToDate: {
                    total: "0",
                    perGame: "0"
                },

                projectedRemaining: {
                    perGame: "0",
                    total: "0"
                },

                projectedTotal: {
                    perGame: "0",
                    total: "0"
                }
            },

            expenses: {
                seasonToDate: {
                    total: "0",
                },

                projectedRemaining: {
                    total: "0",
                },

                projectedTotal: {
                    total: "0",
                }
            }

        }
    }

    /**
     * Rewards are split based on a blended rating that uses both your team’s long-term strength and its current-season performance. 
     * Higher-rated teams receive a larger share of the pool, lower-rated teams receive a smaller share, and every team always earns something. 
     * The system scales smoothly, so even small rating improvements increase your rewards, while bigger jumps make a noticeable difference.
     * @param totalRewards 
     * @param teams 
     * @returns 
     */
    calculateRewardsPerTeam( totalRewards: number, teams: Team[] ) : RewardPerTeam[] {

        const BASE_RATING = 1500
        const STEP = 300
        const MIN_RATING = 1400

        if (teams.length === 0) return []

        const computeShares = (getRating: (t: Team) => number) => {
            // Zero out teams below threshold
            const eligible = teams.map(t => ({
                team: t,
                rating: getRating(t),
                weight: getRating(t) >= MIN_RATING
                    ? Math.pow(2, (getRating(t) - BASE_RATING) / STEP)
                    : 0
            }))

            const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0)

            if (totalWeight === 0) {
                // Everyone below threshold → everyone gets zero
                return teams.map(() => 0)
            }

            return eligible.map(e => e.weight / totalWeight)
        }

        const longTermShares = computeShares(t => t.longTermRating.rating)
        const seasonShares = computeShares(t => t.seasonRating.rating)

        const half = totalRewards / 2

        return teams.map((t, i) => {
            const longTermAmount = longTermShares[i] * half
            const seasonAmount = seasonShares[i] * half

            return {
                _id: t._id,
                amount: longTermAmount + seasonAmount,
                longTermAmount,
                seasonAmount
            }
        })
    }



}



export {
    FinanceService
}
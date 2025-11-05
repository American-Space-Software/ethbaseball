import { inject, injectable } from "inversify";

import { Expenses, FinanceSeason, Lineup, Revenue, RotationPitcher, Team } from "../dto/team.js";

import { Player } from "../dto/player.js";

import { LEASE_PER_CAPACITY, Position} from "./enums.js";

import { LineupService } from "./lineup-service.js";
import { ethers } from "ethers";
import { RollChartService } from "./roll-chart-service.js";
import { GameTeamFinance } from "../dto/game.js";
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

        financeSeason.attendance.seasonToDate.gateTickets += gameTeamFinance.gateTickets
        financeSeason.attendance.seasonToDate.seasonTickets += gameTeamFinance.seasonTickets
        financeSeason.attendance.seasonToDate.totalAttendance = financeSeason.attendance.seasonToDate.gateTickets + financeSeason.attendance.seasonToDate.seasonTickets

        financeSeason.expenses.seasonToDate.stadiumLease = (BigInt(financeSeason.expenses.seasonToDate.stadiumLease) + BigInt(gameTeamFinance.stadiumLease)).toString()
        financeSeason.expenses.seasonToDate.total = BigInt(financeSeason.expenses.seasonToDate.stadiumLease).toString()

        financeSeason.revenue.seasonToDate.gate = (BigInt(financeSeason.revenue.seasonToDate.gate) + BigInt(gameTeamFinance.gateTicketRevenue)).toString()
        financeSeason.revenue.seasonToDate.localMedia = (BigInt(financeSeason.revenue.seasonToDate.localMedia) + BigInt(gameTeamFinance.localTvRevenue)).toString()
        financeSeason.revenue.seasonToDate.nationalMedia = (BigInt(financeSeason.revenue.seasonToDate.nationalMedia) + BigInt(gameTeamFinance.nationalTvRevenue)).toString()
        financeSeason.revenue.seasonToDate.seasonTickets = (BigInt(financeSeason.revenue.seasonToDate.seasonTickets) + BigInt(gameTeamFinance.seasonTicketRevenue)).toString()
        financeSeason.revenue.seasonToDate.total = (BigInt(financeSeason.revenue.seasonToDate.gate) + 
                                                   BigInt(financeSeason.revenue.seasonToDate.localMedia) + 
                                                   BigInt(financeSeason.revenue.seasonToDate.nationalMedia) + 
                                                   BigInt(financeSeason.revenue.seasonToDate.seasonTickets)).toString()
        financeSeason.revenue.seasonToDate.perGame = BigInt(financeSeason.totalGamesPlayed) > 0 ? (BigInt(financeSeason.revenue.seasonToDate.total) / BigInt(financeSeason.totalGamesPlayed)).toString() : BigInt(0).toString()

        financeSeason.profit.seasonToDate.total = (BigInt(financeSeason.revenue.seasonToDate.total) - BigInt(financeSeason.expenses.seasonToDate.total)).toString()

    }

    setFinancialProjections(
                          tls:TeamLeagueSeason,
                          league:League,
                          city:City,
                          stadium:Stadium
                        ) {


        let gamesPerSeason = tls.financeSeason.totalGamesPlayed + tls.financeSeason.totalGamesRemaining
        let gamesRemaining = tls.financeSeason.homeGamesRemaining + tls.financeSeason.awayGamesRemaining

        //If we haven't sold season tickets then we do it once and don't change it for the rest of the season.
        if (!tls.financeSeason.attendance.seasonTicketsSold) {
            tls.financeSeason.attendance.seasonTicketsSold = this.calculateSeasonTicketSales(league.rank, tls.fanInterestShortTerm, tls.fanInterestLongTerm, city.population, stadium.capacity)
        }
        
        tls.financeSeason.currentTicketPrice = this.calculateTicketPrice(league.rank, tls.fanInterestShortTerm, tls.fanInterestLongTerm, city.population, stadium.capacity).toString()

        // let projectedPayrollPerGame = gamesRemaining > 0 ? projectedPayrollTotal / BigInt(gamesPerSeason) : BigInt(0)                  

        let seasonTicketRevenuePerGame = this.calculateSeasonTicketRevenuePerGame(BigInt(tls.financeSeason.currentTicketPrice), tls.financeSeason.attendance.seasonTicketsSold)


        let gateTicketsPerGame = this.calculateSingleGameTicketSales(league.rank, tls.fanInterestShortTerm, tls.fanInterestLongTerm, city.population, stadium.capacity, tls.financeSeason.attendance.seasonTicketsSold)
        let gateRevenuePerGame = this.calculateGateRevenuePerGame(BigInt(tls.financeSeason.currentTicketPrice), gateTicketsPerGame)

        let localMediaRevenuePerGame = this.calculateLocalMediaRevenuePerGame(league.rank, tls.fanInterestShortTerm, tls.fanInterestLongTerm, city.population, stadium.capacity)
        let nationMediaRevenuePerGame = this.getNationalMediaRevenuePerGame(league.rank)

        let stadiumLeaseTotal =  this.calculateStadiumLease(league.rank, stadium.capacity)
        let stadiumLeasePerGame = stadiumLeaseTotal  / BigInt(gamesPerSeason)





        //Set projected attendance remaining
        tls.financeSeason.attendance.projectedRemaining.seasonTickets = tls.financeSeason.attendance.seasonTicketsSold * gamesRemaining
        tls.financeSeason.attendance.projectedRemaining.gateTickets = gateTicketsPerGame * gamesRemaining
        tls.financeSeason.attendance.projectedRemaining.totalAttendance = tls.financeSeason.attendance.projectedRemaining.gateTickets + tls.financeSeason.attendance.projectedRemaining.seasonTickets

        tls.financeSeason.attendance.projectedTotal.seasonTickets = tls.financeSeason.attendance.seasonToDate.seasonTickets + tls.financeSeason.attendance.projectedRemaining.seasonTickets
        tls.financeSeason.attendance.projectedTotal.gateTickets = tls.financeSeason.attendance.seasonToDate.gateTickets + tls.financeSeason.attendance.projectedRemaining.gateTickets
        tls.financeSeason.attendance.projectedTotal.totalAttendance = tls.financeSeason.attendance.seasonToDate.totalAttendance + tls.financeSeason.attendance.projectedRemaining.totalAttendance

        //Set projected expenses remaining
        // tls.financeSeason.expenses.projectedRemaining.payroll = (projectedPayrollPerGame * BigInt(gamesRemaining)).toString()
        tls.financeSeason.expenses.projectedRemaining.stadiumLease = (stadiumLeasePerGame * BigInt(gamesRemaining)).toString()
        tls.financeSeason.expenses.projectedRemaining.total = this.calculateTotalExpenses(tls.financeSeason.expenses.projectedRemaining).toString()

        //And totals
        tls.financeSeason.expenses.projectedTotal.stadiumLease = (BigInt(tls.financeSeason.expenses.seasonToDate.stadiumLease) + BigInt(tls.financeSeason.expenses.projectedRemaining.stadiumLease)).toString()
        tls.financeSeason.expenses.projectedTotal.total = this.calculateTotalExpenses(tls.financeSeason.expenses.projectedTotal).toString()


        //Set projected revenue remaining
        tls.financeSeason.revenue.projectedRemaining.seasonTickets = (seasonTicketRevenuePerGame * BigInt( tls.financeSeason.homeGamesRemaining )).toString()
        tls.financeSeason.revenue.projectedRemaining.gate = (gateRevenuePerGame * BigInt( tls.financeSeason.homeGamesRemaining )).toString()

        tls.financeSeason.revenue.projectedRemaining.localMedia = (localMediaRevenuePerGame * BigInt(gamesRemaining)).toString()
        tls.financeSeason.revenue.projectedRemaining.nationalMedia = (nationMediaRevenuePerGame * BigInt(gamesRemaining)).toString()

        tls.financeSeason.revenue.projectedRemaining.total = this.calculateTotalRevenue(tls.financeSeason.revenue.projectedRemaining).toString()


        //And totals
        tls.financeSeason.revenue.projectedTotal.seasonTickets = (BigInt(tls.financeSeason.revenue.seasonToDate.seasonTickets) + BigInt(tls.financeSeason.revenue.projectedRemaining.seasonTickets)).toString()
        tls.financeSeason.revenue.projectedTotal.gate = (BigInt(tls.financeSeason.revenue.seasonToDate.gate) + BigInt(tls.financeSeason.revenue.projectedRemaining.gate)).toString()

        tls.financeSeason.revenue.projectedTotal.localMedia = (BigInt(tls.financeSeason.revenue.seasonToDate.localMedia) + BigInt(tls.financeSeason.revenue.projectedRemaining.localMedia)).toString()
        tls.financeSeason.revenue.projectedTotal.nationalMedia = (BigInt(tls.financeSeason.revenue.seasonToDate.nationalMedia) + BigInt(tls.financeSeason.revenue.projectedRemaining.nationalMedia)).toString()

        tls.financeSeason.revenue.projectedTotal.total = this.calculateTotalRevenue(tls.financeSeason.revenue.projectedTotal).toString()

        //Profit/loss
        tls.financeSeason.profit.projectedRemaining.total = (BigInt(tls.financeSeason.revenue.projectedRemaining.total) - BigInt(tls.financeSeason.expenses.projectedRemaining.total)).toString()
        tls.financeSeason.profit.projectedTotal.total = (BigInt(tls.financeSeason.revenue.projectedTotal.total) - BigInt(tls.financeSeason.expenses.projectedTotal.total)).toString()

        this.setPerGameRevenue(tls.financeSeason.revenue.projectedTotal, gamesPerSeason)
        this.setPerGameRevenue(tls.financeSeason.revenue.projectedRemaining, tls.financeSeason.totalGamesRemaining)
                    
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

    getNationalMediaRevenuePerGame(leagueRank:number) : bigint {

        // Combine inputs to calculate ticket price
        let leagueRankFactor = 1

        Array.from({ length: leagueRank - 1 }, () => {
            leagueRankFactor *= .5
        }) 

        return ethers.parseUnits( (TOTAL_NATIONAL_MEDIA_REVENUE_PER_GAME * leagueRankFactor).toString()  , 'ether')
    }

    calculateLocalMediaRevenuePerGame(leagueRank:number, fanInterestShortTerm:number, fanInterestLongTerm:number, cityPopulation:number, stadiumCapacity:number) : bigint {

        let demandChange = this.getDemandChange(leagueRank, fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity)

        let localMediaRevenuePerGame = this.rollChartService.applyChange(AVG_LOCAL_MEDIA_REVENUE_PER_GAME, demandChange)

        if (localMediaRevenuePerGame > MAX_LOCAL_MEDIA_REVENUE_PER_GAME) localMediaRevenuePerGame = MAX_LOCAL_MEDIA_REVENUE_PER_GAME

        return ethers.parseUnits( localMediaRevenuePerGame.toString()  , 'ether')

    }

    calculateStadiumLease(leagueRank:number, stadiumCapacity:number) : bigint {

        let perSeat = LEASE_PER_CAPACITY * this.getLeagueRankModifier(leagueRank)

        return ethers.parseUnits( (perSeat * stadiumCapacity).toString()  , 'ether')

    }

    calculateTotalRevenue(revenue:Revenue) {
        return BigInt(revenue.gate) + BigInt(revenue.localMedia) + BigInt(revenue.nationalMedia) + BigInt(revenue.seasonTickets)
    }

    calculateTotalExpenses(expenses:Expenses) {
        return  BigInt(expenses.stadiumLease)
    }

    setPerGameRevenue(revenue:Revenue, games:number) {
        let totalRevenue = this.calculateTotalRevenue(revenue)
        revenue.perGame = games > 0 ? BigInt(totalRevenue / BigInt(games)).toString() : BigInt(0).toString()
    }

    // calculateProjectedPayroll(plss:PlayerLeagueSeason[]) : bigint {

    //     let payroll:bigint = BigInt(0)

    //     for (let pls of plss) {

    //         //Get current season's contract
    //         payroll += BigInt(pls.contractYear.salary)

    //     }

    //     return payroll

    // }

    // getProjectedRemainingPayroll(roster:PlayerLeagueSeason[], gamesPerSeason:number, gamesRemaining:number) {
    //     let projectedPayrollTotal = this.calculateProjectedPayroll(roster)
    //     let projectedPayrollPerGame = gamesRemaining > 0 ? projectedPayrollTotal / BigInt(gamesPerSeason) : BigInt(0)     
    //     return (projectedPayrollPerGame * BigInt(gamesRemaining)).toString()
    // }


}



export {
    FinanceService
}
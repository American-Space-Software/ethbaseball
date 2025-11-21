import assert from "assert"

import { getContainer } from "./inversify.config.js"

import { SchemaService } from "../src/service/schema-service.js"

import { FinanceService } from "../src/service/finance-service.js"
import { DIAMONDS_PER_DAY } from "../src/service/enums.js"


describe('FinanceService', async () => {

    let service:FinanceService
    let schemaService:SchemaService

    before("", async () => {

        let container = getContainer()
        
        service = container.get(FinanceService)
        schemaService = container.get(SchemaService)

        await schemaService.load()
       
    })

    it("should calculate daily rewards", async () => {

        const teams = [
            { _id: "t1500", longTermRating: { rating: 1500 }, seasonRating: { rating: 1500 } },
            { _id: "t1800", longTermRating: { rating: 1800 }, seasonRating: { rating: 1800 } },
            { _id: "t2100", longTermRating: { rating: 2100 }, seasonRating: { rating: 2100 } }
        ]

        // @ts-ignore
        const result = service.calculateRewardsPerTeam(DIAMONDS_PER_DAY, teams)

        const total = result
            .map(r => r.amount)
            .reduce((a, b) => a + b, 0)

        assert(total === DIAMONDS_PER_DAY)

        const r1500 = result.find(r => r._id == "t1500")!
        const r1800 = result.find(r => r._id == "t1800")!
        const r2100 = result.find(r => r._id == "t2100")!

        assert(r1500.amount === 142.85714285714286)
        assert(r1800.amount === 285.7142857142857)
        assert(r2100.amount === 571.4285714285714)

        // optional: check the 50/50 breakdown since season == long-term
        assert(r1500.longTermAmount === r1500.seasonAmount)
        assert(r1800.longTermAmount === r1800.seasonAmount)
        assert(r2100.longTermAmount === r2100.seasonAmount)
    })

    it("should distribute rewards for 100 teams with rating steps of 10", () => {

        const teams = []
        for (let i = 0; i < 100; i++) {
            const rating = 1500 + i * 10
            teams.push({
                _id: "t" + rating,
                longTermRating: { rating },
                seasonRating: { rating }
            })
        }

        // @ts-ignore
        const result = service.calculateRewardsPerTeam(DIAMONDS_PER_DAY, teams)

        const total = result
            .map(r => r.amount)
            .reduce((a, b) => a + b, 0)

        assert(Math.floor(total) === DIAMONDS_PER_DAY)

        // Spot check totals
        assert(result.find(r => r._id == "t1500")?.amount === 2.5743962541425263)
        assert(result.find(r => r._id == "t1840")?.amount === 5.647324238351594)
        assert(result.find(r => r._id == "t1850")?.amount === 5.779324185169594)
        assert(result.find(r => r._id == "t1860")?.amount === 5.914409484488096)
        assert(result.find(r => r._id == "t2020")?.amount === 8.559742904525228)
        assert(result.find(r => r._id == "t2480")?.amount === 24.776505172235826)
        assert(result.find(r => r._id == "t2490")?.amount === 25.355628528189197)

        // optional: a quick sanity check that longTerm + season = total for one example
        const anyTeam = result.find(r => r._id == "t1500")!
        assert(Math.abs(anyTeam.amount - (anyTeam.longTermAmount + anyTeam.seasonAmount)) < 1e-9)
    })

    it("should give specific rewards when long-term is equal and season differs", () => {

        const teams = [
            { _id: "tA", longTermRating: { rating: 1500 }, seasonRating: { rating: 1500 } },
            { _id: "tB", longTermRating: { rating: 1500 }, seasonRating: { rating: 1800 } },
            { _id: "tC", longTermRating: { rating: 1500 }, seasonRating: { rating: 2100 } }
        ]

        // @ts-ignore
        const result = service.calculateRewardsPerTeam(DIAMONDS_PER_DAY, teams)

        const total = result
            .map(r => r.amount)
            .reduce((a, b) => a + b, 0)

        assert(total === DIAMONDS_PER_DAY)

        const rA = result.find(r => r._id == "tA")!
        const rB = result.find(r => r._id == "tB")!
        const rC = result.find(r => r._id == "tC")!

        // totals
        assert(rA.amount === 238.09523809523807)
        assert(rB.amount === 309.5238095238095)
        assert(rC.amount === 452.3809523809524)

        // breakdowns
        assert(rA.longTermAmount === 166.66666666666666)
        assert(rA.seasonAmount === 71.42857142857143)

        assert(rB.longTermAmount === 166.66666666666666)
        assert(rB.seasonAmount === 142.85714285714286)

        assert(rC.longTermAmount === 166.66666666666666)
        assert(rC.seasonAmount === 285.7142857142857)
    })

    it("should blend long-term and season ratings with specific values", () => {

        const teams = [
            // Strong long-term, weak season
            { _id: "tLT", longTermRating: { rating: 2100 }, seasonRating: { rating: 1500 } },

            // Weak long-term, strong season
            { _id: "tSEASON", longTermRating: { rating: 1500 }, seasonRating: { rating: 2100 } },

            // Balanced in both
            { _id: "tBALANCED", longTermRating: { rating: 1800 }, seasonRating: { rating: 1800 } }
        ]

        // @ts-ignore
        const result = service.calculateRewardsPerTeam(DIAMONDS_PER_DAY, teams)

        const total = result
            .map(r => r.amount)
            .reduce((a, b) => a + b, 0)

        assert(total === DIAMONDS_PER_DAY)

        const rLT = result.find(r => r._id == "tLT")!
        const rSEASON = result.find(r => r._id == "tSEASON")!
        const rBAL = result.find(r => r._id == "tBALANCED")!

        // totals
        assert(rLT.amount === 357.14285714285717)
        assert(rSEASON.amount === 357.14285714285717)
        assert(rBAL.amount === 285.7142857142857)

        // breakdowns
        assert(rLT.longTermAmount === 285.7142857142857)
        assert(rLT.seasonAmount === 71.42857142857143)

        assert(rSEASON.longTermAmount === 71.42857142857143)
        assert(rSEASON.seasonAmount === 285.7142857142857)

        assert(rBAL.longTermAmount === 142.85714285714286)
        assert(rBAL.seasonAmount === 142.85714285714286)
    })



    after("After", async () => {
    })


})


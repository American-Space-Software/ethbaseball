// import assert, { fail } from "assert"


// import { getContainer } from "./inversify.config.js"


// import { GLICKO_SETTINGS, PlayerService } from "../src/service/data/player-service.js"

// import { OwnerService } from "../src/service/data/owner-service.js"

// import { SchemaService } from "../src/service/data/schema-service.js"
// import { TeamService } from "../src/service/data/team-service.js"
// import { CityService } from "../src/service/data/city-service.js"

// import { FinanceService } from "../src/service/finance-service.js"
// import { TeamLeagueSeason } from "../src/dto/team-league-season.js"
// import { LadderService } from "../src/service/ladder-service.js"
// import { Position } from "../src/service/enums.js"

// import { StadiumService } from "../src/service/data/stadium-service.js"
// import { UniverseService } from "../src/service/universe-service.js"
// import { TeamLeagueSeasonService } from "../src/service/data/team-league-season-service.js"
// import { LeagueService } from "../src/service/data/league-service.js"

// import { SeasonService } from "../src/service/data/season-service.js"

// import { PlayerLeagueSeasonService } from "../src/service/data/player-league-season-service.js"


// describe('TeamService', async () => {

//     let service: TeamService
//     let financeService:FinanceService
//     let ladderService:LadderService
//     let stadiumService:StadiumService
//     let cityService:CityService
//     let teamLeagueSeasonService:TeamLeagueSeasonService
//     let universeService:UniverseService
//     let leagueService:LeagueService
//     let seasonService:SeasonService
//     let playerService:PlayerService
//     let plsService:PlayerLeagueSeasonService

//     let ownerService:OwnerService
//     let schemaService:SchemaService

//     before('Before', async () => {
        
//         let container = getContainer()
        
//         service = container.get(TeamService)
//         ownerService = container.get(OwnerService)
//         schemaService = container.get(SchemaService)
//         financeService = container.get(FinanceService)
//         ladderService = container.get(LadderService)
//         cityService = container.get(CityService)
//         stadiumService = container.get(StadiumService)
//         universeService = container.get(UniverseService)
//         teamLeagueSeasonService = container.get(TeamLeagueSeasonService)
//         leagueService = container.get(LeagueService)
//         seasonService = container.get(SeasonService)
//         playerService = container.get(PlayerService)
//         plsService = container.get(PlayerLeagueSeasonService)

//         await schemaService.load()

//         // owner = await ownerService.getOrCreate("yyyvvvmmmbb")
//         // owner2 = await ownerService.getOrCreate("yyyvvvmmmbb2")


//         // //Draft 27 players
//         // firstTeam = await playerService.draftTeam(1, "abc", dayjs(simDate).format("YYYY-MM-DD"))
//         // secondTeam = await playerService.draftTeam(14, "abcd", dayjs(simDate).format("YYYY-MM-DD"))
//         // let thirdTeam = await playerService.draftTeam(27, "abcd", dayjs(simDate).format("YYYY-MM-DD"))

//         // for (let team of [firstTeam, secondTeam, thirdTeam]) {
//         //     for (let player of team) {
//         //         player.ownerId = owner._id
//         //         await playerService.put(player)
//         //     }
//         // }





//         // //Draft another team to a second owner
//         // fourthTeam = await playerService.draftTeam(40, "abcdc", dayjs(simDate).format("YYYY-MM-DD"))

//         // for (let player of fourthTeam) {
//         //     player.ownerId = owner2._id
//         //     await playerService.put(player)
//         // }

//         // ownedPlayers = await playerService.getByOwner(owner, { limit: 1000, offset: 0 })
//         // assert.strictEqual(ownedPlayers.length, 39)

//         // let city = new City()
//         // city.name = "Blah"
//         // city.state = "PA"
//         // city.population = 3
//         // await cityService.put(city)

//         // team = new Team()
//         // team.ownerId = owner._id
//         // team.cityId = city._id
//         // team.isGhost = false
//         // team.name = "The team"
//         // team.finances = {
//         //     diamondBalance: "0",
//         //     seasons: []
//         // }
//         // team.colors = {
//         //     color1: "",
//         //     color2: ""
//         // }
//         // team.overallRecord = {
//         //     wins: 0,
//         //     losses: 0,
//         //     winPercent:0,
//         //     gamesBehind:0,
//         //     resultLast10:[],
//         //     runsScored:0,
//         //     runsAgainst:0,
//         //     rank:0
//         // }
//         // team.rating = { rating: 1500, ratingDeviation: 0, volatility: 0 }
//         // team.lineups = []

//         // await service.put(team)

//     })

//     // it("should add rostered players to a team", async () => {

//     //     await service.addPlayers(team, firstTeam)

//     //     let players = await playerService.getByTeam(team)

//     //     assert.strictEqual(players.length, 13)

//     // })




//     // it("should fail to add duplicate players to a team", async () => {

//     //     let players = await playerService.getByTeam(team)

//     //     //Make room on the team
//     //     await service.removeFromTeam(players.slice(0, 5))


//     //     //Add player that still is on team
//     //     try {
//     //         await service.addPlayers(team, [players[8]])
//     //         assert.fail("Did not throw exception when adding duplicate player")
//     //     } catch(ex) {
//     //         assert.strictEqual(ex.message, "Player is already on roster.")
//     //     }

//     // })

//     // it("should fail to add players to a team past the roster limit", async () => {

//     //     try {
//     //         await service.addPlayers(team, secondTeam)
//     //         assert.fail("Did not throw exception when adding too many players to roster")
//     //     } catch(ex) {
//     //         assert.strictEqual(ex.message, "Roster would exceed max size.")
//     //     }

//     // })

//     // it("should fail to add players to a team if they're not owned by the same owner", async () => {

//     //     let players = await playerService.getByTeam(team)

//     //     //Make room on the team
//     //     await service.removeFromTeam(players.slice(0, 5))

//     //     try {
//     //         await service.addPlayers(team, fourthTeam.slice(0, 2))
//     //         assert.fail("Did not throw exception when adding unowned players to roster")
//     //     } catch(ex) {
//     //         assert.strictEqual(ex.message, "Player is not on active roster.")
//     //     }

//     // })

//     // it("should remove rostered players from team", async () => {

//     //     let players = await playerService.getByTeam(team)

//     //     await service.removeFromTeam(players)

//     //     //Re-grab list
//     //     players = await playerService.getByTeam(team)

//     //     assert.strictEqual(players.length, 0)

//     // })


//     it("should calculate ticket price", () => {

//         const fanInterestShortTerm = .50
//         const fanInterestLongTerm = .50
//         const cityPopulation = 1000000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("10000000000000000000"), "Ticket price wrong") //10 diamonds

//     })                                

//     it("should calculate ticket price in lower ranked league", () => {

//         const fanInterestShortTerm = .50
//         const fanInterestLongTerm = .50
//         const cityPopulation = 1000000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(2, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("5000000000000000000"), "Ticket price wrong") //5 diamonds

//     })   

//     it("should calculate ticket price in league rank 3", () => {

//         const fanInterestShortTerm = .50
//         const fanInterestLongTerm = .50
//         const cityPopulation = 1000000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(3, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("2500000000000000000"), "Ticket price wrong") //5 diamonds

//     })


//     it("should calculate ticket price with a bigger city", () => {

//         const fanInterestShortTerm = .50
//         const fanInterestLongTerm = .50
//         const cityPopulation = 2000000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("20000000000000000000"), "Ticket price wrong") //10 diamonds
//     })                                



//     it("should calculate ticket price with a smaller city", () => {

//         const fanInterestShortTerm = .50
//         const fanInterestLongTerm = .50
//         const cityPopulation = 500000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("5000000000000000000"), "Ticket price wrong") //10 diamonds
//     })   

//     it("should calculate ticket price with more long term fan interest", () => {

//         const fanInterestShortTerm = .50
//         const fanInterestLongTerm = .75
//         const cityPopulation = 500000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("6250000000000000000"), "Ticket price wrong") //10 diamonds
//     })  




//     it("should calculate ticket price with more long term fan interest", () => {

//         const fanInterestShortTerm = .75
//         const fanInterestLongTerm = .50
//         const cityPopulation = 500000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("6250000000000000000"), "Ticket price wrong") //10 diamonds
//     })  


//     it("should calculate ticket price small city max fan interest", () => {

//         const fanInterestShortTerm = 1
//         const fanInterestLongTerm = 1
//         const cityPopulation = 50000
//         const stadiumCapacity = 50000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("1000000000000000000"), "Ticket price wrong") //1
//     })  


//     it("should calculate ticket price small city max fan interest small stadium", () => {

//         const fanInterestShortTerm = 1
//         const fanInterestLongTerm = 1
//         const cityPopulation = 50000
//         const stadiumCapacity = 10000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")

//         assert(ticketPrice == BigInt("5000000000000000000"), "Ticket price wrong") //5
//     })  



//     it("should calculate ticket price small city max fan interest tiny stadium", () => {

//         const fanInterestShortTerm = 1
//         const fanInterestLongTerm = 1
//         const cityPopulation = 50000
//         const stadiumCapacity = 1000

//         const ticketPrice = financeService.calculateTicketPrice(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//         assert(typeof ticketPrice === "bigint", "Ticket price should be a bigint")
//         assert(ticketPrice == BigInt("50000000000000000000"), "Ticket price wrong") //50
//     })



//     it("should calculate single game ticket sales", () => {

//         const fanInterestShortTerm = .5
//         const fanInterestLongTerm = .5
//         const cityPopulation = 50000
//         const stadiumCapacity = 1000

//         const ticketsSold = financeService.calculateSingleGameTicketSales(1, fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity, 400)


//         assert(ticketsSold == 600, "Not 600")
//     })



//     it("should calculate single game ticket sales with less demand", () => {

//         const fanInterestShortTerm = .25
//         const fanInterestLongTerm = .25
//         const cityPopulation = 30000
//         const stadiumCapacity = 1000

//         const ticketsSold = financeService.calculateSingleGameTicketSales(1, fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity, 400)

//         assert(ticketsSold == 337, "Not 337")
//     })



//     it("should calculate single game ticket sales with max demand (sell out)", () => {

//         const fanInterestShortTerm = 1
//         const fanInterestLongTerm = 1
//         const cityPopulation = 550000
//         const stadiumCapacity = 1000

//         const ticketsSold = financeService.calculateSingleGameTicketSales(1, fanInterestShortTerm, fanInterestLongTerm, cityPopulation, stadiumCapacity, 400)


//         assert(ticketsSold == 600, "Not 600")
//     })


//     // it("should calculate local viewership", () => {

//     //     const fanInterestShortTerm = .50
//     //     const fanInterestLongTerm = .50
//     //     const cityPopulation = 1000000
//     //     const stadiumCapacity = 15000

//     //     const localRevenue = financeService.calculateLocalMediaRevenuePerGame(1, fanInterestShortTerm,fanInterestLongTerm, cityPopulation, stadiumCapacity )

//     //     assert(typeof localRevenue === "bigint", "Ticket price should be a bigint")
//     //     assert(localRevenue == BigInt("216666666666666720000000"), "Ticket price wrong") //216,000 diamonds
//     // })   

//     // it("should calculate max free agent salary", () => {

//     //     let tls = new TeamLeagueSeason()
//     //     tls.financeSeason = ladderService.getDefaultFinanceSeason(10)
//     //     tls.fanInterestLongTerm = .5
//     //     tls.fanInterestShortTerm = .5


//     //     //@ts-ignore
//     //     financeService.setFinancialProjections(tls, { rank: 1 }, {population: 1000000}, { capacity: 20000 }, BigInt(0))

//     //     let spotsToFill = [Position.PITCHER]

//     //     let maxSalary = service.getMaxSalaryOffer(tls.financeSeason, spotsToFill.length, MIN_AAV_CONTRACT)


//     //     assert(maxSalary === 2537500, "Wrong salary")


//     // }) 
    
    
//     // it("should sign best available player from pool", async () => {

//     //     let date = dayjs().toDate()

//     //     await universeService.setupCities()

//     //     //Generate initial league.
//     //     let season:Season = new Season()
//     //     season._id = uuidv4()
//     //     season.startDate = date
//     //     season.isComplete = false
//     //     season.isInitialized = false
        
//     //     await seasonService.put(season)

//     //     let cities = await cityService.list(1, 0)

//     //     let league:League = new League()
//     //     league._id = uuidv4()
//     //     league.rank = 1
//     //     league.name = "blah"

//     //     await leagueService.put(league)

//     //     //Create team/TLS
//     //     let team = new Team()

//     //     //Create a stadium for them to play at.
//     //     let stadium = new Stadium()
//     //     stadium._id = uuidv4()
//     //     stadium.capacity = 40000
//     //     stadium.name = `Blah Field`

//     //     await stadiumService.put(stadium)

//     //     team._id = uuidv4()
//     //     team.diamondBalance = "0"

//     //     team.colors = {
//     //         color1: "1",
//     //         color2: "2"
//     //     }

//     //     //Name the team
//     //     team.name = `T`
//     //     team.abbrev = 'T'

//     //     team.seasonRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }
//     //     team.longTermRating = { rating: 1500, ratingDeviation: GLICKO_SETTINGS.rd, volatility: GLICKO_SETTINGS.vol }


//     //     await service.put(team)


//     //     let financeSeason = ladderService.getDefaultFinanceSeason(ladderService.getScheduleLength(10, 3))
//     //     let tls:TeamLeagueSeason = teamLeagueSeasonService.initNew(team, league, season, cities[0], stadium, financeSeason)
//     //     await teamLeagueSeasonService.put(tls)


//     //     //Create 10 free agent pitchers
//     //     let ratings = [45,50,55,60,65,75,77,80,85,90]

//     //     for (let i=0; i < 10; i++) {

//     //         let player = await playerService.scoutPlayer({ type: Position.PITCHER, onDate: dayjs().format("YYYY-MM-DD") })
//     //         player.overallRating = ratings[i]
//     //         playerService.updateHittingPitchingRatings(player)


//     //         playerService.createFreeAgentContract(player, 45, 600000, 7, 1)

//     //         await playerService.put(player)


//     //         let nextSeasonPLS = new PlayerLeagueSeason()
//     //         nextSeasonPLS.playerId = player._id
//     //         nextSeasonPLS.seasonId = season._id
//     //         nextSeasonPLS.primaryPosition = Position.PITCHER
//     //         nextSeasonPLS.overallRating = player.overallRating
//     //         nextSeasonPLS.hittingRatings = player.hittingRatings
//     //         nextSeasonPLS.pitchRatings = player.pitchRatings
//     //         nextSeasonPLS.startDate = season.startDate
//     //         nextSeasonPLS.endDate = season.endDate

//     //         nextSeasonPLS.stats = {
//     //             //@ts-ignore
//     //             hitting: statService.mergeHitResultsToStatLine({}, {}),
//     //             //@ts-ignore
//     //             pitching: statService.mergePitchResultsToStatLine({}, {})
//     //         }



//     //         nextSeasonPLS.askingPrice = parseFloat(ethers.formatUnits(player.contract.years[0].salary as string, "ether")) 

//     //         await plsService.put(nextSeasonPLS)


//     //     }


//     //     let result = await service.signAvailablePlayer(league, team, Position.PITCHER, tls, season, dayjs().toDate(), 1000000)

//     //     assert.equal(result?.player.contract.years[0].salary, "933333333333333500000000" )
//     //     assert.equal(result?.player.contract.isRookie, false )

//     //     assert.equal(result?.pls.contractYear.salary, "933333333333333500000000" )

//     //     // assert(maxSalary === 7000000, "Wrong salary")

//     // })  


// })
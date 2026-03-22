import { inject, injectable } from "inversify"
import { ALL_PITCH_ZONES, BaseResult, BaseRunners, Colors, Contact, ContactProfile, Count, DefenseCreditType, DefensiveCredit, DevelopmentStrategy, FinanceSeason, GamePlayer, GamePlayerBio, HalfInning, Handedness, HitResultCount, HitterChange, HittingProfile, HittingRatings, HomeAway, InningEndingEvent, LastPlay, LeagueAverage, Lineup, MatchupHandedness, OfficialPlayResult, OfficialRunnerResult, OverallRecord, PersonalityType, Pitch, PitcherChange, PitchingProfile, PitchLog, PitchRatings, PitchResult, PitchResultCount, PitchType, PitchZone, Play, PlayerPercentileRatings, PlayerStatLines, PlayResult, Position, PromotionRelegationLog, Rating, RotationPitcher, RunnerEvent, RunnerResult, Score, ShallowDeep,  SimPitchResult, STANDARD_INNINGS, SwingResult, TeamInfo, ThrowResult, ThrowRoll, UpcomingMatchup, WIN_EXPECTANCY_CHART, WPA, WPAReward } from "../enums.js"
import { RollService } from "../roll-service.js"
import { RollChart } from "../../dto/roll-chart.js"
import { v4 as uuidv4 } from 'uuid';
import { RollChartService } from "../roll-chart-service.js";
import { StatService } from "../stat-service.js";
import dayjs from "dayjs";
import { PlayerSharedService } from "./player-shared-service.js";

const APPLY_PLAYER_CHANGES = true
const PLAYER_CHANGE_SCALE = 0.75

@injectable()
class SimSharedService {

    constructor(
        private rollService:RollService,
        private rollChartService: RollChartService,
        private statService:StatService,
        private playerSharedService:PlayerSharedService   
    ) {}

    startGame(command:StartGameCommand) {

        let game = command.game

        //Validate lineups
        this.validateGameLineup(command.awayTLS.lineups[0], command.awayPlayers, command.awayStartingPitcher, command.date)
        this.validateGameLineup(command.homeTLS.lineups[0], command.homePlayers, command.homeStartingPitcher, command.date)

        let awayInfo = this.buildTeamInfoFromTeam(command.leagueAverages, command.awayTLS, command.awayTLSPlain,  command.awayPlayers, command.awayPlssPlain, command.awayStartingPitcher, command.away.colors.color1, command.away.colors.color2, HomeAway.AWAY, 1)
        let homeInfo = this.buildTeamInfoFromTeam(command.leagueAverages, command.homeTLS, command.homeTLSPlain, command.homePlayers, command.homePlssPlain, command.homeStartingPitcher, command.home.colors.color1, command.home.colors.color2, HomeAway.HOME, 1 + command.awayPlayers.length)

        game.leagueAverages = command.leagueAverages

        //Set teams on game.
        game.away = awayInfo            
        game.home = homeInfo

        game.startDate = command.date
        game.count = {
            balls: 0,
            strikes: 0,
            outs: 0
        }

        game.isStarted = true
        
        return game 
    }



    finishGame(game:Game) : void {

        let homeWin = game.score.home > game.score.away

        let winningTeam:TeamInfo = homeWin ? game.home : game.away
        let losingTeam:TeamInfo = homeWin ? game.away : game.home

        game.winningTeamId = winningTeam._id
        game.losingTeamId = losingTeam._id

        //WPA rewards
        let rewards:WPAReward[] = this.generateWPA(game)

        //Mark player team win/loss
        for(let winGp of winningTeam.players) {

            if (winGp.currentPosition == Position.PITCHER && winGp.isPitcherOfRecord) {
                game.winningPitcherId = winGp._id
                winGp.pitchResult.wins = 1
            } 

            winGp.pitchResult.teamWins = 1
            winGp.hitResult.teamWins = 1

        }

        for (let loseGp of losingTeam.players) {

            if (loseGp.currentPosition == Position.PITCHER && loseGp.isPitcherOfRecord) {
                game.losingPitcherId = loseGp._id
                loseGp.pitchResult.losses = 1
            }

            loseGp.pitchResult.teamLosses = 1
            loseGp.hitResult.teamLosses = 1

        }

        //Get all players
        let gamePlayers:GamePlayer[] = [].concat(winningTeam.players).concat(losingTeam.players)

        //Update wpa for players
        for (let gamePlayer of gamePlayers) {

            let hittingRewards = rewards.find(r => r.hitting == true && r.playerId == gamePlayer._id)
            let pitchingRewards = rewards.find(r => r.hitting == false && r.playerId == gamePlayer._id)

            gamePlayer.hitResult.wpa = hittingRewards?.reward || 0
            gamePlayer.pitchResult.wpa = pitchingRewards?.reward || 0
            
        }


        //Mark game as finished
        game.isFinished = true



    }

    generateWPA(game:Game) : WPAReward[] {
        
        let rewards:WPAReward[] = []

        let plays:Play[] = this.getPlays(game)

        for (let play of plays) {

            let hitter:GamePlayerBio = this.buildGamePlayerBio(this.getGamePlayer(game, play.hitterId))
            let pitcher:GamePlayerBio = this.buildGamePlayerBio(this.getGamePlayer(game, play.pitcherId))

            let playRewards = this.getWPAFromPlay(play, hitter, pitcher, play == plays[plays.length -1] /* is last play*/)

            for (let reward of playRewards.rewards) {  
                              
                let existingReward = rewards.find( r => r.hitting == reward.hitting && r.playerId == reward.playerId)

                if (existingReward) {
                    existingReward.reward += reward.reward
                } else {
                    rewards.push({
                        hitting: reward.hitting,
                        playerId: reward.playerId,
                        reward: reward.reward
                    })
                }

            }

        }

        return rewards

    }

    getWPAFromPlay(play:Play, hitter:GamePlayer|GamePlayerBio, pitcher:GamePlayer|GamePlayerBio, isLastPlay:boolean) : WPA {

        let expectancyBefore = this.getWinExpectancy(play.inningNum, play.inningTop, play.runner.result.start.first != undefined, play.runner.result.start.second != undefined, play.runner.result.start.third != undefined, play.count.start.outs, play.score.start, false)
        
        let inningTop = play.inningTop
        let inningNum = play.inningNum
        let outs = play.count.end.outs


        if (play.count.end.outs >= 3) {

            if (inningTop) {
                inningTop = false
            } else {
                inningNum++
                inningTop = true
            }

            outs = 0
        }
                
        let expectancyAfter = this.getWinExpectancy(inningNum, inningTop, play.runner.result.end.first != undefined, play.runner.result.end.second != undefined, play.runner.result.end.third != undefined, outs, play.score.end, isLastPlay )
        
        let total = expectancyAfter - expectancyBefore

        return {
            expectancyBefore: expectancyBefore,
            expectancyAfter: expectancyAfter,
            total: total,
            rewards: this.getWinExpectancyRewards(play.inningTop, total, { hitter: hitter, pitcher: pitcher}, play.credits)
        }

    }

    getWinExpectancy(inning:number, top:boolean, runner1B:boolean, runner2B:boolean, runner3B:boolean, outs:number, score:Score, isComplete:boolean) : number {

        if (isComplete) {

            if (score.home > score.away) return 1
            if (score.away > score.home) return 0

            throw new Error("Error calculating WPA at end of game")

        }

        let baseSit:number

        if (!runner1B && !runner2B && !runner3B) baseSit = 1
        if (runner1B && !runner2B && !runner3B) baseSit = 2
        if (!runner1B && runner2B && !runner3B) baseSit = 3
        if (runner1B && runner2B && !runner3B) baseSit = 4
        if (!runner1B && !runner2B && runner3B) baseSit = 5
        if (runner1B && !runner2B && runner3B) baseSit = 6
        if (!runner1B && runner2B && runner3B) baseSit = 7
        if (runner1B && runner2B && runner3B) baseSit = 8

        if (inning > 9) inning = 9        
        
        let weRow = WIN_EXPECTANCY_CHART.filter(r => r.inning == inning && r.top == (top == true ? 'Top' : 'Bottom') && r.basesit == baseSit && r.outs == outs)[0]

        let homeDiff = score.home - score.away
        
        if (homeDiff < -15) homeDiff = -15
        if (homeDiff > 15) homeDiff = 15

        if (homeDiff == 0) {
            return weRow.zero
        } else if (homeDiff < 0) {
            return weRow[homeDiff.toString().replace("-", "neg")]
        } else if (homeDiff > 0) {
            return weRow[`pos${homeDiff.toString()}`]
        } 

    }

    getWinExpectancyRewards(isTopInning:boolean, wpaTotal:number, matchup, defensiveCredits:DefensiveCredit[]) : WPAReward[] {
        
        let rewards:WPAReward[] = []

        //wpaTotal represents the total amount of wpa awarded to the home team.

        let homePlayerId = isTopInning ? matchup.pitcher._id : matchup.hitter._id
        let awayPlayerId = isTopInning ? matchup.hitter._id : matchup.pitcher._id

        if (wpaTotal == 0) {
                //no change
                rewards.push({ playerId: matchup.pitcher._id, hitting: false, reward: wpaTotal })
                rewards.push({ playerId: matchup.hitter._id, hitting: true, reward: wpaTotal })

        } else {

            //WPA applied for home team
            rewards.push({ playerId: homePlayerId, hitting: homePlayerId == matchup.hitter._id, reward: wpaTotal })

            //Negative WPA for away team
            rewards.push({ playerId: awayPlayerId, hitting: awayPlayerId == matchup.hitter._id, reward: wpaTotal * -1 })
        }




        return rewards


    }

    simPitch(game:Game, rng:any) {

        let command:SimPitchCommand = this.createSimPitchCommand(game, rng)


        if (!command.play) {

            let runner1B = command.offense.players.find( p => p._id == command.offense.runner1BId)
            let runner2B = command.offense.players.find( p => p._id == command.offense.runner2BId)
            let runner3B = command.offense.players.find( p => p._id == command.offense.runner3BId)

            command.play = this.createPlay(
                game.playIndex, 
                command.hitter, 
                command.pitcher, 
                command.catcher, 
                runner1B, 
                runner2B, 
                runner3B, 
                command.matchupHandedness, 
                game.count.outs, 
                game.score, 
                game.currentInning, 
                game.isTopInning
          )

          //Add play to half inning
          command.halfInning.plays.push(command.play)

          //Just add the play.
          return

        }


        let result:SimPitchResult

        let continueAtBat = true
        let isInningEndingEvent = false

        //Do matchup
        try {
            result = this.simPitchRolls(command, command.play.pitchLog.pitches?.length || 0)
            continueAtBat = result.continueAtBat
        } catch(ex) {
            //Ignore inning ending events errors.
            if (!(ex instanceof InningEndingEvent)) throw ex
            continueAtBat = false
            isInningEndingEvent = true
        }


        if (!continueAtBat) {
            this.finishPlay(game, command, isInningEndingEvent)
        }
        

    }

    finishPlay(game:Game, command:SimPitchCommand, isInningEndingEvent:boolean) {

        let fielderPlayer:GamePlayer

        let ballInPlay:Pitch = command.play.pitchLog.pitches.find(p => p.result == PitchResult.IN_PLAY)

        let isFieldingError = false

        if (!isInningEndingEvent) {
            
            if (ballInPlay) {

                //In play
                let pitch = ballInPlay

                //How much better than average?
                let pitchQualityChange = this.getChange(command.leagueAverages.pitchQuality, pitch.quality)

                let contactRollChart:RollChart = this.getMatchupContactRollChart(command.leagueAverages, command.hitter.hittingRatings.contactProfile, command.pitcher.pitchRatings.contactProfile)

                const pickFielder = (contact:Contact) => {

                    let ignoreList = []
                    
                    switch(contact) {
                        case Contact.LINE_DRIVE:
                            //No line drives to the catcher. 
                            ignoreList.push(Position.CATCHER)
                            break
                        
                    }

                    //Who did it get hit towards?
                    fielderPlayer = undefined

                    command.play.fielder = this.getFielder(command.rng, command.leagueAverages, command.play.matchupHandedness.hits)

                    //If we match on the ignore list get fielders until we don't.
                    while (ignoreList.includes(command.play.fielder)) {
                        command.play.fielder = this.getFielder(command.rng, command.leagueAverages, command.play.matchupHandedness.hits)
                    }

                    fielderPlayer = command.defense.players.find(p => p.currentPosition == command.play.fielder)


                }

                let hitQuality:number

                //What kind of contact? 
                command.play.contact = contactRollChart.entries.get(this.rollService.getRoll(command.rng, 0, 99)) as Contact

                pickFielder(command.play.contact)

                //Calculate team defense. We're going to use this overall average to simulate being slightly better or worse at positioning.
                let teamDefenseChange:number = this.getChange(command.leagueAverages.hittingRatings.defense, this.getTeamDefense(command.defense))
                let fielderDefenseChange:number = this.getChange(command.leagueAverages.hittingRatings.defense, fielderPlayer.hittingRatings.defense)

                //Was it high quality contact? 1-1000
                hitQuality = this.getHitQuality(command.rng, pitchQualityChange, teamDefenseChange, fielderDefenseChange, command.play.contact, pitch.guess)

                let powerRollChart:RollChart = this.getMatchupPowerRollChart(command.leagueAverages, command.hitterChange, command.pitcherChange)

                //O, 1B, 2B, 3B, or HR
                command.play.result = powerRollChart.entries.get(hitQuality) as PlayResult

                //No pop up/line drive hits to IF. 
                while (this.isInAir(command.play.contact) && !this.isToOF(command.play.fielder) && command.play.result != PlayResult.OUT) {
                    pickFielder(command.play.contact)
                }

                //No ground ball outs to the OF. Redirect to infielder.
                while (command.play.contact == Contact.GROUNDBALL && this.isToOF(command.play.fielder) && command.play.result == PlayResult.OUT) {
                    pickFielder(command.play.contact)
                }

                //No doubles or triples to infielders
                while ( (command.play.result == PlayResult.DOUBLE || command.play.result == PlayResult.TRIPLE) && this.isToInfielder(command.play.fielder)) {
                    pickFielder(command.play.contact)
                }


                if (!fielderPlayer) {
                   throw new Error(`No fielder found at position ${command.play.fielder}`)
                }

                if (this.isToOF(command.play.fielder)) {
                    command.play.shallowDeep = this.getShallowDeep(command.rng, command.leagueAverages)
                } 

                if (command.play.result == PlayResult.HR) {
                    if (command.play.contact == Contact.GROUNDBALL) {
                        command.play.contact = hitQuality > 70 ? Contact.LINE_DRIVE : Contact.FLY_BALL
                    }

                    command.play.shallowDeep = ShallowDeep.DEEP
                } 

                if (command.play.result == PlayResult.TRIPLE) {
                    command.play.shallowDeep = ShallowDeep.DEEP //Triples always deep for now.
                } 

            } else {

                //If the ball isn't in play let's make sure it's a legit reason.
                if (command.play.result != PlayResult.STRIKEOUT && command.play.result != PlayResult.BB &&  command.play.result != PlayResult.HIT_BY_PITCH && !isInningEndingEvent) {
                    throw new Error("Error with pitchlog")
                }

            }

            //Players could have moved. Grab the correct base runners.
            let runner1B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.first)
            let runner2B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.second)
            let runner3B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.third)

            if (command.play.runner.result.end.first && !runner1B) {
                throw new Error("Missing 1B runner.")
            }

            if (command.play.runner.result.end.second && !runner2B) {
                throw new Error("Missing 2B runner.")
            }

            if (command.play.runner.result.end.third && !runner3B) {
                throw new Error("Missing 3B runner.")
            }

            //Add in-play runner events
            let inPlayRunnerEvents: RunnerEvent[] = this.getRunnerEvents(command.rng, command.play.runner.result.end, command.halfInningRunnerEvents, command.play.credits, 
                                command.leagueAverages, command.play.result, command.play.contact, command.play.shallowDeep, command.hitter, fielderPlayer, runner1B, runner2B, runner3B, 
                                command.offense, command.defense, command.pitcher, command.play.pitchLog.count.pitches - 1)


            isFieldingError = inPlayRunnerEvents.filter( re => re.isError)?.length > 0

            command.play.runner.events.push(...inPlayRunnerEvents)

        }

        
        this.validateRunnerResult(command.play.runner.result.end)

        //If playResult was OUT and there was an error change playResult to ERROR.
        if (command.play.result == PlayResult.OUT && isFieldingError) {
            command.play.result = PlayResult.ERROR
        }

        command.play.officialPlayResult = this.getOfficialPlayResult(command.play.result, command.play.contact, command.play.shallowDeep, command.play.fielder,command.play.runner.events)

        command.play.fielderId = fielderPlayer?._id




        //Players could have moved. Grab the correct base runners.
        let runner1B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.first)
        let runner2B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.second)
        let runner3B: GamePlayer = command.offense.players.find( p => p._id == command.play.runner.result.end.third)


        this.logResults(command.offense, command.defense, command.hitter, command.pitcher, runner1B?._id, runner2B?._id, runner3B?._id, command.play.credits, command.play.runner.events, command.play.contact, command.play.officialPlayResult, command.play.result, command.play.pitchLog, isInningEndingEvent)

        //Reset count
        game.count.balls = 0
        game.count.strikes = 0

        //Increase outs
        game.count.outs += command.play.runner?.events.filter( re => re.movement.isOut).length

        game.playIndex++

        //Set runners
        command.offense.runner1BId = command.play.runner?.result.end.first
        command.offense.runner2BId = command.play.runner?.result.end.second
        command.offense.runner3BId = command.play.runner?.result.end.third

        //Add result to line score and gamescore
        this.updateLinescoreRuns(game, command.halfInning, command.play)
        this.updateLinescoreHits(game, command.halfInning, command.play)
        this.updateGameRuns(game, command.play)

        //Make sure the play has the end count. Clone so we don't accidentally change them.
        command.play.count.end = JSON.parse(JSON.stringify(game.count))
        command.play.score.end = JSON.parse(JSON.stringify(game.score))

        //Move lineup to next hitter except on failed stolen bases that end an inning.
        //@ts-ignore
        if (command.play.officialPlayResult != OfficialRunnerResult.CAUGHT_STEALING_2B && command.play.officialPlayResult != OfficialRunnerResult.CAUGHT_STEALING_3B) {
            this.nextHitter(command.offense)
        }

        const isWalkoff = (game.currentInning >=STANDARD_INNINGS && !game.isTopInning && game.score.home > game.score.away)

        if (game.count.outs >= 3 || isWalkoff ) {

            //Update linescore LOB
            let leftOnBase = [command.offense.runner1BId, command.offense.runner2BId, command.offense.runner3BId ].filter( r => r != undefined).length

            if (leftOnBase > 0) {
                this.updateLinescoreLOB(command.halfInning, leftOnBase)
            }

            //Clear runners
            this.clearRunners(command.offense)

            //Clear outs
            game.count.outs = 0

            //Check if game over
            game.isComplete = this.isGameOver(game)

            if (!game.isComplete) {

                const from = { inning: game.currentInning, isTop: game.isTopInning }

                if (game.isTopInning) {
                    game.isTopInning = false
                } else {
                    game.currentInning++
                    game.isTopInning = true
                }

                const to = { inning: game.currentInning, isTop: game.isTopInning }

                //Init next half inning
                game.halfInnings.push(this.initHalfInning(game.currentInning, game.isTopInning))
            } 
        }

    }

    createSimPitchCommand(game:Game, rng:any) {
        
        let halfInning:HalfInning = game.halfInnings.find(i => i.num == game.currentInning && i.top == game.isTopInning)

        if (!halfInning) {
            halfInning = this.initHalfInning(game.currentInning, game.isTopInning) 
            game.halfInnings.push(halfInning)
        }

        let offense:TeamInfo = this.getOffense(game)
        let defense:TeamInfo = this.getDefense(game)

        let matchup:UpcomingMatchup = this.getUpcomingMatchup(game)

        let halfInningRunnerEvents:RunnerEvent[] = halfInning.plays.map(p => p.runner?.events).reduce((accumulator, reArray) => accumulator.concat(reArray), []) 

        let hitter:GamePlayer = offense.players.find( p => p._id == matchup.hitter._id)
        let pitcher = defense.players.find( p => p._id == matchup.pitcher._id)
        let catcher:GamePlayer = defense.players.find( p => p.currentPosition == Position.CATCHER)

        if (!hitter) throw new Error("createSimPitchCommand: matchup.hitter not found on offense roster")
        if (!pitcher) throw new Error("createSimPitchCommand: matchup.pitcher not found on defense roster")
        if (!catcher) throw new Error("createSimPitchCommand: catcher not found on defense roster")

        let matchupHandedness: MatchupHandedness = this.getMatchupHandedness(hitter, pitcher)

        let hitterChange:HitterChange = matchupHandedness.throws == Handedness.L ? hitter.hitterChange.vsL : hitter.hitterChange.vsR
        let pitcherChange:PitcherChange = matchupHandedness.hits == Handedness.L ? pitcher.pitcherChange.vsL : pitcher.pitcherChange.vsR
        
        let allPlays:Play[] = this.getPlays(game)

        //Either grab the play in progress or create a new one.
        let play: Play

        if (allPlays?.length > 0) {
            const lastPlay = allPlays[allPlays.length - 1]

            if (!lastPlay.count?.end) {
                play = lastPlay
            }
        }

        
    
        return {

            game: game,
            play:play,

            offense:offense,
            defense:defense,

            hitter:hitter,
            pitcher:pitcher,

            hitterChange:hitterChange,
            pitcherChange:pitcherChange,

            catcher:catcher,

            halfInningRunnerEvents:halfInningRunnerEvents,
            halfInning: halfInning,
            leagueAverages: game.leagueAverages,

            matchupHandedness:matchupHandedness,

            rng:rng

        }
    }

    createPlay(playIndex:number,
               hitter:GamePlayer, 
               pitcher:GamePlayer, 
               catcher:GamePlayer, 
               runner1B:GamePlayer|undefined,
               runner2B:GamePlayer|undefined,
               runner3B:GamePlayer|undefined,
               matchupHandedness:MatchupHandedness,
               outs:number,
               score:Score,
               inningNum: number,
               inningTop: boolean
    ) : Play {

            let runnerResult:RunnerResult = {
                first: runner1B?._id,
                second: runner2B?._id,
                third: runner3B?._id,
                scored: [],
                out: []
            }

            //Preserve starting runners to save with play data
            let startingRunnerResult = JSON.parse(JSON.stringify(runnerResult))
            let endingRunnerResult = JSON.parse(JSON.stringify(runnerResult))


            let startingCount = JSON.parse(JSON.stringify( {
                balls: 0,
                strikes: 0,
                outs: outs
            }))

            let startingScore = JSON.parse(JSON.stringify(score))


            let defensiveCredits:DefensiveCredit[] = []

            let pitchLog: PitchLog = {

                count: {
                    balls: 0,
                    strikes: 0,
                    fouls: 0,
                    pitches: 0
                },

                pitches: []
            }

            return {
                index: playIndex,
                inningNum: inningNum,
                inningTop: inningTop,
                pitchLog: pitchLog,
                credits: defensiveCredits,
                runner: {
                    events: [],
                    result: {
                        start: startingRunnerResult,
                        end: endingRunnerResult //change this one during the play
                    }
                },
                hitterId: hitter._id,
                pitcherId: pitcher._id,
                catcherId: catcher._id,
                matchupHandedness: matchupHandedness,
                count: {
                    start: startingCount
                },
                score: {
                    start: startingScore
                }
            }


    }

    buildGamePlayerBio(player:GamePlayer) : GamePlayerBio {

        return { 
                
            _id: player._id,
            fullName: player.fullName,
            // ratingBefore: player.ratingBefore,

            age: player.age,
            ownerId: player.ownerId,

            throws: player.throws,
            hits: player.hits,

            //@ts-ignore
            hitResult: this.statService.hitResultToHitterStatLine(player.hitResult),

            //@ts-ignore
            pitchResult: this.statService.pitchResultToPitcherStatLine(player.pitchResult)
        }

    }

    initGame(game:Game) {

        game._id = uuidv4()

        game.currentInning = 1
        game.isTopInning = true
        game.isStarted = false
        game.isComplete = false
        game.isFinished = false
        game.count = {
            balls: 0,
            strikes: 0,
            outs: 0
        }

        game.score = {
            away: 0,
            home: 0
        }

        game.halfInnings = []

        game.playIndex = 0
        // game.level = command.level

        return game
    }

    isGameOver(game: Game): boolean {

        //in the bottom of an inning 9+ where we're not tied. Game over.
        if (game.currentInning >= STANDARD_INNINGS && game.isTopInning == false && game.score.home != game.score.away) return true 

        //after the top of the 9+ inning where the home team is ahead. Game over.
        if (game.currentInning >= STANDARD_INNINGS && game.isTopInning == true && game.score.home > game.score.away) return true 

        return false

    }

    clearRunners(team:TeamInfo) {
        team.runner1BId = undefined
        team.runner2BId = undefined
        team.runner3BId = undefined
    }

    nextHitter(team: TeamInfo) {

        if (team.currentHitterIndex >= 8) {
            team.currentHitterIndex = 0
        } else {
            team.currentHitterIndex++
        }

    }

    getOffense(game:Game) {

        if (game.isTopInning) {
            return game.away
        } else {
            return game.home
        }
    }

    getDefense(game:Game) {

        if (game.isTopInning) {
            return game.home
        } else {
            return game.away
        }
    }

    initHalfInning(num:number, top: boolean) : HalfInning {

        let halfInning:HalfInning = {
            linescore: {
                runs: 0,
                hits: 0,
                errors: 0,
                leftOnBase: 0
            },
            num: num,
            top: top,
            plays: []
        }

        return halfInning

    }

    updateLinescoreHits(game:Game, halfInning:HalfInning, play:Play) {

        if (this.isHit(play.result)) {
            if (game.isTopInning) {
                halfInning.linescore.hits++
            } else {
                halfInning.linescore.hits++
            }
        }

    }

    updateLinescoreRuns(game:Game, halfInning:HalfInning, play:Play) {

        if (play.runner?.result?.end?.scored?.length > 0) {

            if (game.isTopInning) {
                halfInning.linescore.runs += play.runner?.result?.end?.scored?.length
            } else {
                halfInning.linescore.runs += play.runner?.result?.end?.scored?.length
            }

        }

    }

    updateLinescoreLOB(halfInning:HalfInning, lob:number) {
        halfInning.linescore.leftOnBase += lob
    }

    updateGameRuns(game:Game, play:Play) {

        if (play.runner?.result?.end?.scored?.length > 0) {

            if (game.isTopInning) {
                game.score.away += play.runner?.result?.end?.scored?.length
            } else {
                game.score.home += play.runner?.result?.end?.scored?.length
            }

        }

    }

    // return true if in range, otherwise false
    inRange(x: number, min: number, max: number) {
        return ((x - min) * (x - max) <= 0)
    }

    getBaserunners(game:Game) : BaseRunners {

        if (game.isTopInning) {

            return {
                first: game.away.runner1BId ? this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.runner1BId) ) : undefined,
                second: game.away.runner2BId ? this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.runner2BId) ) : undefined,
                third: game.away.runner3BId ? this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.runner3BId) ) : undefined,
            }


        } else {

            return {
                first: game.home.runner1BId ? this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.runner1BId) ): undefined,
                second: game.home.runner2BId ? this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.runner2BId) ) : undefined,
                third: game.home.runner3BId ? this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.runner3BId) ) : undefined,
            }

        }

    }

    getUpcomingMatchup(game:Game) : UpcomingMatchup {

        if (game.isTopInning) {

            return {
                hitter: this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.lineupIds[game.away.currentHitterIndex]) ),
                pitcher: this.buildGamePlayerBio( game.home.players.find(p => p._id == game.home.currentPitcherId) )
            }

        } else {

            return {
                hitter: this.buildGamePlayerBio(  game.home.players.find(p => p._id == game.home.lineupIds[game.home.currentHitterIndex]) ),
                pitcher: this.buildGamePlayerBio( game.away.players.find(p => p._id == game.away.currentPitcherId) )
            }


        }

    }

    getPlays(game:Game) : Play[] {
        return game.halfInnings.map((inning) => inning.plays).reduce((accumulator, playsArray) => accumulator.concat(playsArray), []) // Flatten into a single array
    }

    getLastPlays(game:Game) : LastPlay[] {

        let plays:Play[] = this.getPlays(game) // Flatten into a single array
    
        plays = plays.slice(Math.max(plays.length - 5, 0))

        let lastPlays:LastPlay[] = []

        for (let play of plays) {
            
            let hi:HalfInning = game.halfInnings.find(i => i.plays.includes(play))
            
            lastPlays.push({
                hitter: this.buildGamePlayerBio( this.getGamePlayer(game, play.hitterId) ),
                pitcher:this.buildGamePlayerBio( this.getGamePlayer(game, play.pitcherId) ),
                play: play,
                inning: hi.num,
                top: hi.top,
                first: play.runner?.result?.end.first ? this.buildGamePlayerBio(this.getGamePlayer(game, play.runner?.result?.end?.first)) : undefined,
                second: play.runner?.result?.end.second ? this.buildGamePlayerBio(this.getGamePlayer(game, play.runner?.result?.end?.second)) : undefined,
                third: play.runner?.result?.end.third ? this.buildGamePlayerBio(this.getGamePlayer(game, play.runner?.result?.end?.third)) : undefined,
            }) 
        }

        return lastPlays

    }

    getGamePlayer(game:Game, playerId:string) {

        let player = game.away.players.find(p => p._id == playerId)

        if (!player) {
            player = game.home.players.find( p => p._id == playerId)
        }

        return player

    }   

    getLineScore(game:Game) {

        let away = [game.away.name, '', '', '', '', '', '', '', '', '', 0, 0, 0]
        let home = [game.home.name, '', '', '', '', '', '', '', '', '', 0, 0, 0]

        //Set inning scores
        for (let halfInning of game.halfInnings) {

            if (halfInning.top) {

                if (halfInning.num > STANDARD_INNINGS) {
                    away.splice(halfInning.num, 0, 0)
                    home.splice(halfInning.num, 0, 0)
                }

                away[halfInning.num] = halfInning?.linescore?.runs ? halfInning?.linescore?.runs : 0
            } else {
                home[halfInning.num] = halfInning?.linescore.runs ? halfInning?.linescore?.runs : 0
            }

        }

        //Set total score
        away[Math.max(game.currentInning + 1, 10)] = game.score.away
        home[Math.max(game.currentInning + 1, 10)] = game.score.home

        //Set hits
        away[Math.max(game.currentInning + 2, 11)] = game.halfInnings.filter(i => i.top == true)?.map(i => i.plays.filter(p => this.isHit(p.result))?.length || 0)?.reduce((acc, num) => acc + num, 0)
        home[Math.max(game.currentInning + 2, 11)] = game.halfInnings.filter(i => i.top == false)?.map(i => i.plays.filter(p => this.isHit(p.result))?.length || 0)?.reduce((acc, num) => acc + num, 0)

        return {
            away: away,
            home: home 
        }

    }
    
    getMatchupHandedness(hitter:GamePlayer, pitcher:GamePlayer): MatchupHandedness {

        let pitchHand = pitcher.throws
        let batSide

        if (hitter.hits == Handedness.S) {
            batSide = pitcher.throws == Handedness.L ? Handedness.R : Handedness.L
        } else {
            batSide = hitter.hits
        }

        return {
            throws: pitchHand,
            hits: batSide,
            vsSameHand: hitter.hits == pitcher.throws
        }


    }

    validateGameLineup(lineup:Lineup, plss:PlayerLeagueSeason[], startingPitcher:RotationPitcher, gameDate:Date) {

        //Make sure there are 9 spots in the order and 5 spots in the rotation
        if (lineup.order.length != 9) {
            throw new Error("Lineup must have 9 players.")
        }

        if (lineup.rotation.length != 5) {
            throw new Error("Rotation must have 5 players.")
        }

        //Make sure no one is playing a duplicate position
        let filledSpots = lineup.order.filter(o => o.position != undefined)
        let filledPositions = new Set(filledSpots.map( o => o.position))

        if (filledPositions.size != filledSpots.length) {
            throw new Error("Duplicate position players.")
        }

        let sp = plss.find( p => p.playerId == startingPitcher._id)

        if (!startingPitcher || !sp) {
            throw new Error(`No valid starting pitcher for ${dayjs(gameDate).format('YYYY-MM-DD')}`)
        }

    }    

    buildTeamInfoFromTeam(leagueAverage:LeagueAverage, tls:TeamLeagueSeason, tlsPlain, plss:PlayerLeagueSeason[], plssPlain, startingPitcher:RotationPitcher, color1:string, color2:string, homeAway:HomeAway, startingId:number) : TeamInfo {

        let players = plssPlain.map( pls => pls.player)

        let gamePlayer:GamePlayer[] = this.initGamePlayers(leagueAverage, players, startingPitcher, tls.teamId, color1, color2, startingId)

        let lineup:Lineup = JSON.parse(JSON.stringify(tls.lineups[0]))

        if (!startingPitcher) throw new Error("No valid starting pitcher.")

        lineup.order.find( p => p.position == Position.PITCHER)._id = startingPitcher._id

        let pitcherGP = gamePlayer.find( gp => gp._id == startingPitcher._id)

        

        let teamInfo:TeamInfo = {
            logoId: tlsPlain.logoId,
            _id: tlsPlain.team._id,
            owner: {
                _id: tlsPlain.team.userId,
            },            
            finances: {},
            name: tlsPlain.team.name,
            abbrev: tlsPlain.team.abbrev,
            cityName: tlsPlain.city?.name,
            players: gamePlayer,

            seasonRating: {
                before:tlsPlain.seasonRating.rating
            },
        
            longTermRating: {
                before:tlsPlain.longTermRating.rating
            },
        
            overallRecord: {
                before:tlsPlain.overallRecord
            },

            lineupIds: lineup.order.map( op => op._id ),

            currentHitterIndex: 0,
            currentPitcherId: pitcherGP._id,

            runner1BId: undefined,
            runner2BId: undefined,
            runner3BId: undefined,

            homeAway: homeAway,

            color1: color1,
            color2: color2

        }

        //Sync players to the proper positions. Right now this is simple because 
        //a player can only play one position but it's possible we'll need to pass
        //this info in later.
        teamInfo.lineupIds.forEach( (id, idx) => {

            let player:GamePlayer = teamInfo.players.find( p => p._id == id)
            //Set spot in lineup
            if (player) player.lineupIndex = idx 

        })

        return teamInfo

    }    

    initGamePlayers(leagueAverage:LeagueAverage, players:Player[], startingPitcher:RotationPitcher, teamId:string, color1:string, color2:string, startingId:number) : GamePlayer[] {

        let gamePlayers:GamePlayer[] = []
        
        for (let p of players) {
        
            let isStartingPitcher = p._id == startingPitcher?._id

            let hittingRatings = p.hittingRatings
            let pitchRatings = p.pitchRatings

            if (isStartingPitcher && startingPitcher.stamina != 1) {

                let modifier = Math.max(.25, startingPitcher.stamina) // minimium of .25 effective

                this.playerSharedService.modifyRatings(hittingRatings, modifier)
                this.playerSharedService.modifyRatings(pitchRatings, modifier)
            }

            gamePlayers.push({ 
                _id: p._id,
                coverImageCid: p.coverImageCid,
                fullName: `${p.firstName} ${p.lastName}`,
                firstName: p.firstName,
                lastName: p.lastName,
                displayName: `${p.firstName[0]}. ${p.lastName}`,

                teamId: teamId,

                age: p.age,
                
                overallRating:{
                    before: p.overallRating,
                },

                ownerId: p.ownerId,
                color1: color1,
                color2: color2,

                throws: p.throws,
                hits: p.hits,
            
                pitchRatings: pitchRatings,
                hittingRatings: hittingRatings,

                currentPosition: p.primaryPosition,
    
                hitResult: {
                    games: 0,
                    teamWins: 0,
                    teamLosses: 0,
                    pa: 0,
                    atBats: 0,
                    hits: 0,
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    homeRuns: 0,
                    runs: 0,
                    rbi: 0,
                    bb: 0,
                    sb: 0,
                    cs: 0,
                    hbp: 0,
                    so: 0,
                    lob: 0,
                    sacBunts: 0,
                    sacFlys: 0,
                    groundOuts: 0,
                    flyOuts: 0,
                    lineOuts: 0,
                    outs: 0,
                    groundBalls: 0,
                    lineDrives: 0,
                    flyBalls: 0,
                    gidp: 0,
                    po: 0,
                    assists: 0,
                    e: 0,
                    pitches: 0,
                    balls: 0,
                    strikes: 0,
                    fouls: 0,
                    swings: 0,
                    swingAtBalls: 0,
                    swingAtStrikes: 0,
                    inZone: 0,
                    ballsInPlay: 0,
                    totalPitchQuality: 0,
                    totalPitchPowerQuality: 0,
                    totalPitchLocationQuality: 0,
                    totalPitchMovementQuality: 0,
                    inZoneContact: 0,
                    outZoneContact: 0,
                    passedBalls: 0,
                    csDefense: 0,
                    doublePlays: 0,
                    sbAttempts: 0,
                    outfieldAssists: 0,
                    wpa:0
                },
    
                pitchResult: {
                    games: 0,
                    teamWins: 0,
                    teamLosses: 0,
                    outs: 0,
                    er: 0,
                    so: 0,
                    hits: 0,
                    bb: 0,
                    hbp: 0,
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    runs: 0,
                    homeRuns: 0,
                    wins: 0,
                    losses: 0,
                    saves: 0,
                    bs: 0,
                    sho: 0,
                    cg: 0,
                    battersFaced: 0,
                    atBats: 0,
                    groundOuts: 0,
                    flyOuts: 0,
                    lineOuts: 0,
                    groundBalls: 0,
                    lineDrives: 0,
                    flyBalls: 0,
                    pitches: 0,
                    balls: 0,
                    strikes: 0,
                    fouls: 0,
                    swings: 0,
                    swingAtBalls: 0,
                    swingAtStrikes: 0,
                    inZone: 0,
                    starts: p._id == startingPitcher?._id ? 1 : 0,
                    ip: '0.0',
                    sacFlys: 0,
                    ballsInPlay: 0,
                    totalPitchQuality: 0,
                    totalPitchPowerQuality: 0,
                    totalPitchLocationQuality: 0,
                    totalPitchMovementQuality: 0,
                    inZoneContact: 0,
                    outZoneContact: 0,
                    wildPitches: 0,
                    wpa:0
                },

                hitterChange: {
                    vsL: this.getHitterChange(p.hittingRatings, leagueAverage.hittingRatings, Handedness.L),
                    vsR: this.getHitterChange(p.hittingRatings, leagueAverage.hittingRatings, Handedness.R),
                },

                pitcherChange: {
                    vsL: this.getPitcherChange(p.pitchRatings, leagueAverage.pitchRatings, Handedness.L),
                    vsR: this.getPitcherChange(p.pitchRatings, leagueAverage.pitchRatings, Handedness.R),
                },
    
                lineupIndex: undefined,

                isPitcherOfRecord: isStartingPitcher
                
                
            })
        }

        return gamePlayers
    }

    simPitchRolls(command: SimPitchCommand, pitchIndex: number): SimPitchResult {

        //Sort pitcher's pitches by rating
        // command.pitcher.pitchRatings.pitches.sort((a, b) => b.rating - a.rating)

        const pitches = command.pitcher.pitchRatings.pitches
        const weights = [50, 25, 15, 5, 5] //later this can be passed in via strategy

        //Choose a pitch type
        const pitchType: PitchType = this.rollService.weightedRandom(command.rng, pitches, weights.slice(0, pitches.length))

        //Hitter will try to guess which pitch.
        const hitterPitchGuess: PitchType =
            command.pitcher.pitchRatings.pitches[this.rollService.getRoll(command.rng, 0, pitches.length - 1)]
        const guessPitch: boolean = hitterPitchGuess == pitchType

        //How fast is it going? We can translate this to MPH later. 0-99.
        const powerQuality = this.getPowerQuality(command.rng, command.pitcherChange.powerChange)

        //Did the pitcher throw it where they wanted? 0-99
        const locationQuality = this.getLocationQuality(command.rng, command.pitcherChange.controlChange)

        //How much movement does the pitch have? 0-99
        const movementQuality = this.getMovementQuality(command.rng, command.pitcherChange.movementChange)

        //Average for overall pitch quality
        const pitchQuality = this.getPitchQuality(powerQuality, locationQuality, movementQuality)

        //Is it in the strike zone?
        const inZone = this.isInZone(command.rng, locationQuality, command.leagueAverages.inZoneRate)

        const intentZone = this.getIntentZone(command.rng)
        const actualZone = this.getActualZone(intentZone, locationQuality)

        const pitch: Pitch = {
            intentZone,
            actualZone,
            type: pitchType,
            quality: pitchQuality,
            locQ: locationQuality,
            movQ: movementQuality,
            powQ: powerQuality,
            swing: false,
            con: false,
            result: inZone ? PitchResult.STRIKE : PitchResult.BALL,
            inZone,
            guess: guessPitch,
            isWP: false,
            isPB: false,
        }

        // --- Determine outcome (but DO NOT mutate balls/strikes here) ---
        if (locationQuality <= 0.025) {

            //Passed ball
            pitch.isPB = true
            pitch.inZone = false
            pitch.result = PitchResult.BALL

        } else if (locationQuality <= 0.25) {

            //HBP
            pitch.inZone = false
            pitch.result = PitchResult.HBP

        } else if (locationQuality <= 0.50) {

            //Wild pitch
            pitch.isWP = true
            pitch.inZone = false
            pitch.result = PitchResult.BALL

        } else {

            //If the batter guesses the pitch reduce the effective quality when the batter swings.
            const effectivePitchQuality = guessPitch ? pitchQuality * 0.85 : pitchQuality

            //Does the batter swing?
            const swingResult = this.getSwingResult(
                command.rng,
                command.hitterChange,
                command.leagueAverages,
                inZone,
                effectivePitchQuality,
                guessPitch
            )

            //Create pitch.
            pitch.swing = (swingResult != SwingResult.NO_SWING)
            pitch.con = (swingResult == SwingResult.FAIR || swingResult == SwingResult.FOUL)

            // Only set the pitch.result here. Count updates happen once below.
            switch (swingResult) {
                case SwingResult.FAIR:
                    pitch.result = PitchResult.IN_PLAY
                    break

                case SwingResult.FOUL:
                    pitch.result = PitchResult.FOUL
                    break

                case SwingResult.STRIKE:
                    pitch.result = PitchResult.STRIKE
                    break

                case SwingResult.NO_SWING:
                    pitch.result = inZone ? PitchResult.STRIKE : PitchResult.BALL
                    break
            }
        }

        switch (pitch.result) {
            case PitchResult.FOUL:
                command.play.pitchLog.count.fouls++
                if (command.play.pitchLog.count.strikes < 2) {
                    command.play.pitchLog.count.strikes++
                }
                break

            case PitchResult.STRIKE:
                command.play.pitchLog.count.strikes++
                break

            case PitchResult.BALL:
                command.play.pitchLog.count.balls++
                break

            case PitchResult.HBP:
            case PitchResult.IN_PLAY:
                // no balls/strikes added
                break
        }

        command.play.pitchLog.pitches.push(pitch)
        command.play.pitchLog.count.pitches = command.play.pitchLog.pitches.length

        let continueAtBat = true

        //HBP
        if (pitch.result == PitchResult.HBP) {
            command.play.result = PlayResult.HIT_BY_PITCH
            continueAtBat = false
        }

        //In play?
        if (pitch.result == PitchResult.IN_PLAY) continueAtBat = false

        //Strikeout or walk?
        if (command.play.pitchLog.count.balls == 4) {
            command.play.result = PlayResult.BB
            continueAtBat = false
        }

        if (command.play.pitchLog.count.strikes == 3) {
            command.play.result = PlayResult.STRIKEOUT
            continueAtBat = false
        }

        const result: SimPitchResult = {
            continueAtBat,
            pitch,
        }

        this.generateRunnerEventsFromPitch(command, pitchIndex, result)

        command.game.count.balls = command.play.pitchLog.count.balls
        command.game.count.strikes = command.play.pitchLog.count.strikes

        pitch.count = JSON.parse(JSON.stringify(command.game.count))

        return result
    }
    

    generateRunnerEventsFromPitch(command:SimPitchCommand, pitchIndex:number, result:SimPitchResult) {

        let runner1B = command.offense.players.find( p => p._id == command.play.runner.result.end.first)
        let runner2B = command.offense.players.find( p => p._id == command.play.runner.result.end.second)
        let runner3B = command.offense.players.find( p => p._id == command.play.runner.result.end.third)

        if (command.play.runner.result.end.first && !runner1B ) throw new Error(`Runner on 1B not found in offense`)
        if (command.play.runner.result.end.second && !runner2B ) throw new Error(`Runner on 2B not found in offense`)
        if (command.play.runner.result.end.third && !runner3B ) throw new Error(`Runner on 3B not found in offense`)


        let pitchEvents:RunnerEvent[] = this.initRunnerEvents(command.pitcher, 
            undefined,
            runner1B, 
            runner2B, 
            runner3B, 
            pitchIndex
        )

        
        if (result.pitch.isWP) {

            //Move runners up on wild pitch.

            //Advance runners one base
            this.advanceRunnersOneBase(command.play.runner.result.end, pitchEvents, false)

            for (let re of pitchEvents) {
                re.isWP = true
            }

            
        } if (result.pitch.isPB) {

            //Move runners up on passed ball.

            //Advance runners one base
            this.advanceRunnersOneBase(command.play.runner.result.end, pitchEvents, false)

            for (let re of pitchEvents) {
                re.isPB = true
            }

            //Credit the catcher
            command.play.credits.push({
                _id: command.catcher._id,
                type: DefenseCreditType.PASSED_BALL
            })

        } if (result.continueAtBat) {
            
            //Stolen bases
            //Even if there's a good chance they can't go on every pitch
            //No stealing on the last pitch.
            
            this.stealBases(runner1B, runner2B, runner3B, command.rng, command.play.runner.result.end, command.halfInningRunnerEvents, pitchEvents, command.play.credits, command.leagueAverages, command.catcher, command.defense, command.offense, command.pitcher, pitchIndex)            
        }


        command.play.runner.events.push(...this.filterNonEvents(pitchEvents, undefined))


        this.validateInningOver( [].concat(command.halfInningRunnerEvents).concat(command.play.runner.events) )

    }



    getPitcherChange(pitchRatings: PitchRatings, laPitchRatings:PitchRatings, hits:Handedness): PitcherChange {
        return this.rollChartService.getPitcherChange(pitchRatings, laPitchRatings, hits)
    }
    getHitterChange(hittingRatings: HittingRatings, laHittingRatings:HittingRatings, throws:Handedness): HitterChange {
        return this.rollChartService.getHitterChange(hittingRatings, laHittingRatings, throws)
    }

    validateRunners(firstId:string, secondId:string, thirdId:string) {

        let runnerIds = [firstId, secondId, thirdId].filter(r => r != undefined)

        if (new Set(runnerIds).size != runnerIds.length) {
            throw new Error("Runners are not unique.")
        }
        
    }


    validateRunnerResult(runnerResult:RunnerResult) {

        //Validate runs and outs are cool
        if (new Set([].concat(runnerResult.scored).concat(runnerResult.out)).size != (runnerResult.scored.length + runnerResult.out.length) ) {
            throw new Error(`Runner both scored and is out. Problem.`)
        }

        //Validate runners
        this.validateRunners(runnerResult.first, runnerResult.second, runnerResult.third)
    }


    validateInningOver( allEvents:RunnerEvent[]) {

        if ( this.getTotalOuts( allEvents ) >= 3 ) {
            throw new InningEndingEvent()
        }

        return false
    }

    filterNonEvents(runnerEvents:RunnerEvent[], hitter:GamePlayer) {
        return runnerEvents.filter(re => re.movement.end != undefined || re.runner._id == hitter?._id)
    }

    getMatchupPowerRollChart(leagueAverage:LeagueAverage, hitterChange:HitterChange, pitcherChange:PitcherChange) : RollChart {

        let leagueAvgChart: RollChart = this.rollChartService.getPowerRollChart(leagueAverage.powerRollInput)

        if (!APPLY_PLAYER_CHANGES) return leagueAvgChart

        let hitter:RollChart = this.rollChartService.getPowerRollChart(this.rollChartService.buildHitterPowerRollInput(leagueAverage, hitterChange))
        let pitcher:RollChart = this.rollChartService.getPowerRollChart(this.rollChartService.buildPitcherPowerRollInput(leagueAverage, pitcherChange))

        let hitterDiffChart: RollChart = this.rollChartService.diffRollChart(leagueAvgChart, hitter)
        let pitcherDiffChart: RollChart = this.rollChartService.diffRollChart(leagueAvgChart, pitcher)

        return this.rollChartService.applyChartDiffs(hitterDiffChart, pitcherDiffChart, leagueAvgChart)

    }

    getMatchupContactRollChart(leagueAverage:LeagueAverage, hitterContactProfile:ContactProfile, pitcherContactProfile:ContactProfile): RollChart {

        let leagueAvgChart: RollChart = this.rollChartService.getContactTypeRollChart(leagueAverage.contactTypeRollInput)

        if (!APPLY_PLAYER_CHANGES) return leagueAvgChart


        let hitter:RollChart = this.rollChartService.getContactTypeRollChart(hitterContactProfile)
        let pitcher:RollChart = this.rollChartService.getContactTypeRollChart(pitcherContactProfile)

        let hitterDiffChart: RollChart = this.rollChartService.diffRollChart(leagueAvgChart, hitter)
        let pitcherDiffChart: RollChart = this.rollChartService.diffRollChart(leagueAvgChart, pitcher)

        return this.rollChartService.applyChartDiffs(hitterDiffChart, pitcherDiffChart, leagueAvgChart)

    }

    logResults(offense:TeamInfo, defense:TeamInfo, hitter:GamePlayer, pitcher:GamePlayer, runner1BId:string, runner2BId:string, runner3BId:string, defensiveCredits:DefensiveCredit[], runnerEvents: RunnerEvent[], contact: Contact, officialPlayResult: OfficialPlayResult, playResult: PlayResult, pitchLog: PitchLog, isInningEndingEvent:boolean) {

        let outEvents = runnerEvents.filter( re => re.movement?.isOut)

        if (outEvents?.length > 0) {

            this.logOuts(pitcher.pitchResult, outEvents.length)

            //Log out for each runner
            for (let oe of outEvents) {
                this.logOuts(offense.players.find( p => p._id == oe.runner._id).hitResult, 1)
            }

        }


        //Log unearned runs
        let unearnedRuns = runnerEvents.filter( re => re.isScoringEvent)

        //If double play or an error, no RBIs.
        if (outEvents.length <= 1 && this.getTotalOuts(runnerEvents) < 2 && defensiveCredits.find(dc => dc.type == DefenseCreditType.ERROR) == undefined ) {
            this.logRBI(hitter.hitResult, unearnedRuns.length)
        }


        for (let re of unearnedRuns) {
            let runner = offense.players.find(p => p._id == re.runner._id)
            this.logRuns(runner.hitResult, pitcher.pitchResult)

            if (!re.isUnearned) {
                this.logEarnedRuns(pitcher.pitchResult)
            }

        }

        //Log left on base.
        if (this.getTotalOuts(runnerEvents) >= 3) {
            let startRunners = [runner1BId, runner2BId, runner3BId].filter(r => r != undefined).length
            this.logLOB(hitter.hitResult, startRunners - unearnedRuns.length)
        }

        if (this.isAtBat(officialPlayResult)) {
            this.logAtBat(hitter.hitResult, pitcher.pitchResult)
        }

        // gidp:number    
        // doublePlays:number

        //Update wild pitches
        pitcher.pitchResult.wildPitches += pitchLog.pitches.filter( p => p.isWP)?.length

        //Stolen base attempts
        let sbAttempts = runnerEvents.filter(re => re.isSBAttempt)

        for (let re of sbAttempts) {
            let runner = offense.players.find(p => p._id == re.runner._id)
            this.logStolenBaseAttempt(runner.hitResult)
        }

        //Stolen bases
        let sb = runnerEvents.filter(re => re.isSB)

        for (let re of sb) {
            let runner = offense.players.find(p => p._id == re.runner._id)
            this.logStolenBase(runner.hitResult)
        }

        //Caught stealing
        let cs = runnerEvents.filter(re => re.isCS)

        for (let re of cs) {
            let runner = offense.players.find(p => p._id == re.runner._id)
            this.logCaughtStealing(runner.hitResult)
        }


        //Passed balls
        let passedBalls = defensiveCredits.filter( dc => dc.type == DefenseCreditType.PASSED_BALL)

        for (let dc of passedBalls) {
            let defender = defense.players.find(p => p._id == dc._id)
            this.logPassedBall(defender.hitResult)
        }

        //Putouts
        let putouts = defensiveCredits.filter( dc => dc.type == DefenseCreditType.PUTOUT)

        for (let dc of putouts) {
            let defender = defense.players.find(p => p._id == dc._id)
            this.logPutout(defender.hitResult)
        }

        //Assists
        let assists = defensiveCredits.filter( dc => dc.type == DefenseCreditType.ASSIST)

        for (let dc of assists) {
            let defender = defense.players.find(p => p._id == dc._id)
            this.logAssist(defender.hitResult)
        }


        //OF Assists
        let ofAssists = defensiveCredits.filter( dc => dc.type == DefenseCreditType.ASSIST && this.isToOF(defense.players.find(p => p._id == dc._id).currentPosition))

        for (let dc of ofAssists) {
            let defender = defense.players.find(p => p._id == dc._id)
            this.logOutfieldAssist(defender.hitResult)
        }

        //Errors
        let errors = defensiveCredits.filter( dc => dc.type == DefenseCreditType.ERROR)

        for (let dc of errors) {
            let defender = defense.players.find(p => p._id == dc._id)
            this.logErrors(defender.hitResult)
        }

        //Caught stealing defense
        let csDefense = defensiveCredits.filter( dc => dc.type == DefenseCreditType.CAUGHT_STEALING)

        for (let dc of csDefense) {
            let defender = defense.players.find(p => p._id == dc._id)
            this.logCSDefense(defender.hitResult)
        }


        switch (contact) {

            case Contact.FLY_BALL:
                this.logFlyBall(hitter.hitResult, pitcher.pitchResult)
                break

            case Contact.GROUNDBALL:
                this.logGroundball(hitter.hitResult, pitcher.pitchResult)
                break

            case Contact.LINE_DRIVE:
                this.logLineDrive(hitter.hitResult, pitcher.pitchResult)
                break

        }


        switch (playResult) {

            case PlayResult.STRIKEOUT:
                this.logStrikeout(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.BB:
                this.logBB(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.HIT_BY_PITCH:
                this.logHBP(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.SINGLE:
                this.log1B(hitter.hitResult, pitcher.pitchResult)
                this.logHit(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.DOUBLE:
                this.log2B(hitter.hitResult, pitcher.pitchResult)
                this.logHit(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.TRIPLE:
                this.log3B(hitter.hitResult, pitcher.pitchResult)
                this.logHit(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.HR:
                this.logHR(hitter.hitResult, pitcher.pitchResult)
                this.logHit(hitter.hitResult, pitcher.pitchResult)
                break

            case PlayResult.OUT:
            
                switch(contact) {
                    case Contact.FLY_BALL:
                        this.logFlyout(hitter.hitResult, pitcher.pitchResult)
                        break
                    case Contact.GROUNDBALL:
                        this.logGroundout(hitter.hitResult, pitcher.pitchResult)
                        // if (runnerAdvance.hitter.result == -1 && this.getTotalOuts(runnerAdvance) == 2) this.logGidp(command.hitter.hitResult)
                        break
                    case Contact.LINE_DRIVE:
                        this.logLineout(hitter.hitResult, pitcher.pitchResult)
                        break
                }

                break
        
            case PlayResult.ERROR:
                break
                
            default: 

                if (!isInningEndingEvent) {
                    throw Error(`Error logging unknown play result ${playResult}`)
                }


        }


        //Pitcher
        pitcher.pitchResult.games = 1

        pitcher.pitchResult.battersFaced++

        pitcher.pitchResult.pitches += pitchLog.count.pitches
        pitcher.pitchResult.balls += pitchLog.count.balls
        pitcher.pitchResult.strikes += pitchLog.count.strikes
        pitcher.pitchResult.fouls += pitchLog.count.fouls
        
        pitcher.pitchResult.swings += pitchLog.pitches.filter( p => p.swing == true).length || 0
        pitcher.pitchResult.swingAtBalls += pitchLog.pitches.filter( p => p.swing == true && p.inZone == false).length || 0
        pitcher.pitchResult.swingAtStrikes += pitchLog.pitches.filter( p => p.swing == true && p.inZone == true).length || 0
        pitcher.pitchResult.ballsInPlay += pitchLog.pitches.filter( p => p.swing == true && p.result == PitchResult.IN_PLAY).length || 0

        pitcher.pitchResult.inZone += pitchLog.pitches.filter( p => p.inZone == true).length || 0
        pitcher.pitchResult.inZoneContact += pitchLog.pitches.filter( p => p.inZone == true && p.con == true  ).length || 0
        pitcher.pitchResult.outZoneContact += pitchLog.pitches.filter( p => p.inZone == false && p.con == true  ).length || 0
        pitcher.pitchResult.ip = this.statService.getIP(pitcher.pitchResult.outs)


        pitcher.pitchResult.totalPitchQuality += pitchLog.pitches.map( p => p.quality).reduce((prev, curr) => prev + curr)
        pitcher.pitchResult.totalPitchLocationQuality += pitchLog.pitches.map( p => p.locQ).reduce((prev, curr) => prev + curr)
        pitcher.pitchResult.totalPitchMovementQuality += pitchLog.pitches.map( p => p.movQ).reduce((prev, curr) => prev + curr)
        pitcher.pitchResult.totalPitchPowerQuality += pitchLog.pitches.map( p => p.powQ).reduce((prev, curr) => prev + curr)

        //Hitter
        hitter.hitResult.games = 1

        hitter.hitResult.pa++

        hitter.hitResult.pitches += pitchLog.count.pitches
        hitter.hitResult.balls += pitchLog.count.balls
        hitter.hitResult.strikes += pitchLog.count.strikes
        hitter.hitResult.fouls += pitchLog.count.fouls

        hitter.hitResult.swings += pitchLog.pitches.filter( p => p.swing == true).length || 0
        hitter.hitResult.swingAtBalls += pitchLog.pitches.filter( p => p.swing == true && p.inZone == false).length || 0
        hitter.hitResult.swingAtStrikes += pitchLog.pitches.filter( p => p.swing == true && p.inZone == true).length || 0
        hitter.hitResult.ballsInPlay += pitchLog.pitches.filter( p => p.swing == true && p.result == PitchResult.IN_PLAY).length || 0

        hitter.hitResult.inZone += pitchLog.pitches.filter( p => p.inZone == true).length || 0
        hitter.hitResult.inZoneContact += pitchLog.pitches.filter( p => p.inZone == true && p.con == true ).length || 0
        hitter.hitResult.outZoneContact += pitchLog.pitches.filter( p => p.inZone == false && p.con == true  ).length || 0

        hitter.hitResult.totalPitchQuality += pitchLog.pitches.map( p => p.quality).reduce((prev, curr) => prev + curr)
        hitter.hitResult.totalPitchLocationQuality += pitchLog.pitches.map( p => p.locQ).reduce((prev, curr) => prev + curr)
        hitter.hitResult.totalPitchMovementQuality += pitchLog.pitches.map( p => p.movQ).reduce((prev, curr) => prev + curr)
        hitter.hitResult.totalPitchPowerQuality += pitchLog.pitches.map( p => p.powQ).reduce((prev, curr) => prev + curr)

    }

    getTeamDefense(teamInfo: TeamInfo) {

        let teamRating = 0

        //Loop through lineup. Look up each player's current position. Get their defense rating for that position
        for (let id of teamInfo.lineupIds) {
            let player: GamePlayer = teamInfo.players.find(p => p._id == id)
            teamRating += player.hittingRatings.defense
        }

        return Math.round(teamRating / teamInfo.lineupIds.length)

    }

    getHitResultCount() {

        return {
            atBats: 0,
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            runs: 0,
            rbi: 0,
            bb: 0,
            sb: 0,
            cs: 0,
            hbp: 0,
            so: 0,
            lob: 0,
            sacBunts: 0,
            sacFlys: 0,
            groundOuts: 0,
            flyOuts: 0,
            lineOuts: 0,
            groundBalls: 0,
            lineDrives: 0,
            flyBalls: 0,
            gidp: 0,
            po: 0,
            assists: 0,
            e: 0
        }

    }

    getPitchResultCount() {

        return {
            games: 0,
            starts: 0,
            wins: 0,
            losses: 0,
            saves: 0,
            bs: 0,
            outs: 0,
            er: 0,
            so: 0,
            hits: 0,
            bb: 0,
            sho: 0,
            cg: 0,
            pc: 0,
            hbp: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            strikes: 0,
            balls: 0,
            battersFaced: 0,
            atBats: 0,
            pitches: 0,
            runs: 0,
            homeRuns: 0,
            groundOuts: 0,
            flyOuts: 0,
            lineOuts: 0,
            groundBalls: 0,
            lineDrives: 0,
            flyBalls: 0
        }

    }

    applyMinMaxToNumber(num, min, max) {

        num = Math.round(num)

        //Apply the max. If die is greater than max make it the max
        num = Math.min(num, max)

        //If we went negative go with 0
        num = Math.max(min, num)

        return num
    }

    getTotalOuts(runnerEvents: RunnerEvent[]) {
        return runnerEvents.filter( re => re?.movement?.isOut == true).length
    }

    getThrowCount(runnerEvents:RunnerEvent[]) : number  {
        return runnerEvents.filter( re => re?.throw != undefined).length
    }

    getPositionCoveringBase(throwFromPosition:Position, throwToBase:BaseResult) {

        switch(throwToBase) {
            case BaseResult.FIRST:
                return Position.FIRST_BASE
            case BaseResult.SECOND:
                if (throwFromPosition == Position.SECOND_BASE) return Position.SHORTSTOP
                return Position.SECOND_BASE
            case BaseResult.THIRD:
                return Position.THIRD_BASE
            case BaseResult.HOME:
                return Position.CATCHER
        }

    }
    
    initRunnerEvents(pitcher:GamePlayer, hitter:GamePlayer, runner1B:GamePlayer, runner2B:GamePlayer, runner3B:GamePlayer, pitchIndex:number) {

        let hitterRA: RunnerEvent 
        let runner1bRA:RunnerEvent
        let runner2bRA:RunnerEvent
        let runner3bRA:RunnerEvent

        if (hitter) {
            hitterRA = {
                pitchIndex: pitchIndex,
                pitcher: {
                    _id: pitcher._id
                },
    
                runner: {
                    _id: hitter._id,
                    // speed: hitter.hittingRatings.speed,
                    // steals: hitter.hittingRatings.steals
                },
                movement: {
                    start: BaseResult.HOME,
                    isOut: false
                }
            }
        }

        if (runner1B) {
            runner1bRA = {
                pitchIndex: pitchIndex,
                pitcher: {
                    _id: pitcher._id
                },
                runner: {
                    _id: runner1B._id,
                    // speed: runner1B.hittingRatings.speed,
                    // steals: runner1B.hittingRatings.steals
                },                
                movement: {
                    start: BaseResult.FIRST,
                    isOut: false
                },
                isScoringEvent: false,
                isUnearned: false
            }
        }

        if (runner2B) {
            runner2bRA = {
                pitchIndex: pitchIndex,
                pitcher: {
                    _id: pitcher._id
                },
                runner: {
                    _id: runner2B._id,
                    // speed: runner2B.hittingRatings.speed,
                    // steals: runner2B.hittingRatings.steals
                },
                movement: {
                    start: BaseResult.SECOND,
                    isOut: false
                },
                isScoringEvent: false,
                isUnearned: false
            }
        }

        if (runner3B) {
            runner3bRA = {
                pitchIndex: pitchIndex,
                pitcher: {
                    _id: pitcher._id
                },
                runner: {
                    _id: runner3B._id,
                    // speed: runner3B.hittingRatings.speed,
                    // steals: runner3B.hittingRatings.steals
                },
                movement: {
                    start: BaseResult.THIRD,
                    isOut: false
                },
                isScoringEvent: false,
                isUnearned: false
            }
        }

        return [ runner3bRA, runner2bRA, runner1bRA, hitterRA].filter( r => r?.movement != undefined)

    }

    getRunnerEvents(gameRNG, runnerResult:RunnerResult, halfInningRunnerEvents:RunnerEvent[], defensiveCredits:DefensiveCredit[], leagueAverages: LeagueAverage, playResult: PlayResult, 
                    contact: Contact|undefined, shallowDeep: ShallowDeep|undefined, hitter:GamePlayer, fielderPlayer: GamePlayer|undefined, 
                    runner1B:GamePlayer|undefined, runner2B:GamePlayer|undefined, runner3B:GamePlayer|undefined, offense:TeamInfo, defense:TeamInfo, pitcher:GamePlayer, pitchIndex:number) : RunnerEvent[] {
        
        const requiresFielder =
            playResult === PlayResult.OUT ||
            playResult === PlayResult.SINGLE ||
            playResult === PlayResult.DOUBLE ||
            playResult === PlayResult.TRIPLE ||
            playResult === PlayResult.HR

        if (requiresFielder && !fielderPlayer) {
            throw new Error(`${playResult} requires fielderPlayer`)
        }

        const requiresContact =
            playResult === PlayResult.OUT ||
            playResult === PlayResult.SINGLE ||
            playResult === PlayResult.DOUBLE ||
            playResult === PlayResult.TRIPLE ||
            playResult === PlayResult.HR

        if (requiresContact && !contact) {
            throw new Error(`${playResult} requires contact`)
        }


        let events:RunnerEvent[] = this.initRunnerEvents(pitcher, hitter, runner1B, runner2B, runner3B, pitchIndex)

        let hitterRA = events.find( e => e.runner._id == hitter?._id)
        let runner1bRA = events.find( e => e.runner._id == runner1B?._id)
        let runner2bRA = events.find( e => e.runner._id == runner2B?._id)
        let runner3bRA = events.find( e => e.runner._id == runner3B?._id)

        hitterRA.eventType = playResult

        let allEvents = [].concat(halfInningRunnerEvents).concat(events)

        try {

            const DEFAULT_SUCCESS = 95

            switch (playResult) {
    
                case PlayResult.STRIKEOUT:
                    this.runnerIsOut(runnerResult, allEvents, defensiveCredits, defense.players.find( p => p.currentPosition == Position.CATCHER), hitterRA, this.getTotalOuts(allEvents) + 1, BaseResult.HOME)
                    break
    
                case PlayResult.OUT:
    
                    if (!contact) throw new Error("OUT requires contact")
                    if (!fielderPlayer) throw new Error("OUT requires fielderPlayer")

                    //Fly balls. Tag up. 99% success
                    //Deep fly ball
                    if (this.isInAir(contact) && this.isToOF(fielderPlayer?.currentPosition) && (shallowDeep == ShallowDeep.DEEP)) {
                        this.runnerIsOut(runnerResult, allEvents, defensiveCredits, fielderPlayer, hitterRA, this.getTotalOuts(allEvents) + 1, BaseResult.HOME)
                        this.runnersTagWithThrow(gameRNG, runnerResult, leagueAverages, allEvents, events, defensiveCredits, defense,offense, pitcher,  fielderPlayer, runner1bRA, runner2bRA, runner3bRA, 99, pitchIndex)
                        break
                    }
    
                    //Normal fly ball. 95% runner success rate. Roll for throw.
                    if (this.isInAir(contact) && this.isToOF(fielderPlayer?.currentPosition) && (shallowDeep == ShallowDeep.NORMAL)) {
                        this.runnerIsOut(runnerResult, allEvents, defensiveCredits, fielderPlayer, hitterRA, this.getTotalOuts(allEvents) + 1, BaseResult.HOME)
                        this.runnersTagWithThrow(gameRNG, runnerResult, leagueAverages, allEvents, events, defensiveCredits, defense, offense, pitcher, fielderPlayer, runner1bRA, runner2bRA, runner3bRA, 95, pitchIndex)
                        break
                    }
    
                    //Shallow fly ball. Roll for throw. Only run from 3B. Only if good chance to succeed.
                    if (contact == Contact.FLY_BALL && this.isToOF(fielderPlayer?.currentPosition) && shallowDeep == ShallowDeep.SHALLOW) {
    
                        this.runnerIsOut(runnerResult, allEvents, defensiveCredits, fielderPlayer,hitterRA, this.getTotalOuts(allEvents) + 1, BaseResult.HOME)
    
                        if (runnerResult.third) {
    
                            //Unless a 90% chance to succeed don't even run.
                            let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner3B.hittingRatings.speed, DEFAULT_SUCCESS - 30)
    
                            if (chanceRunnerSafe > 90) {
    
                                //Runners from 1B and 2B move forward 
                                this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, false)
                                this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, false)
    
                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: runner3bRA,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.THIRD,
                                    end: BaseResult.HOME,
                                    eventType: OfficialRunnerResult.THIRD_TO_HOME,
                                    eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: false,
                                    isFieldersChoice: false
                                })
    
                            }
    
                        }
    
                        break
                    }

                    //Fly ball to infielder
                    if (this.isInAir(contact) && this.isToInfielder(fielderPlayer.currentPosition) ) {
                        this.runnerIsOut(runnerResult, allEvents, defensiveCredits, fielderPlayer, hitterRA, this.getTotalOuts(allEvents) + 1, BaseResult.HOME)
                        break
                    }
    
                    //If it's a ground ball go for the force out. 
                    if (contact == Contact.GROUNDBALL) {
                
                        // If 2 outs already, always take the out at 1B first.
                        const outsBeforePlay = this.getTotalOuts(allEvents)
                        if (outsBeforePlay >= 2) {

                            // batter-runner force at 1B
                            const chanceRunnerSafe = this.getChanceRunnerSafe(
                                leagueAverages,
                                fielderPlayer.hittingRatings.arm,
                                hitter.hittingRatings.speed,
                                1 //super low chance of being safe
                            )

                            this.runnerToBaseWithThrow({
                                gameRNG: gameRNG,
                                runnerResult: runnerResult,
                                allEvents: allEvents,
                                runnerEvents: events,
                                runnerEvent: hitterRA,
                                hitterEvent: hitterRA,
                                defensiveCredits: defensiveCredits,
                                start: BaseResult.HOME,
                                end: BaseResult.FIRST,
                                eventType: OfficialRunnerResult.HOME_TO_FIRST,
                                eventTypeOut: OfficialRunnerResult.FORCE_OUT,
                                leagueAverage: leagueAverages,
                                defense: defense,
                                pitcher: pitcher,
                                offense: offense,
                                pitchIndex: pitchIndex,
                                throwFrom: fielderPlayer,
                                chanceRunnerSafe: chanceRunnerSafe,
                                isForce: true,
                                isFieldersChoice: false
                            })

                            break
                        }

                        //Handle runner on third. 
                        if (runner3B != undefined) {
    
                            runner3bRA.isForce = (runner2B != undefined && runner1B != undefined)
    
                            if (runner3bRA.isForce) {
    
                                let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner3B.hittingRatings.speed, 1) //low chance
    
                                //Force at home. Other runners advance.
                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: runner3bRA,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.THIRD,
                                    end: BaseResult.HOME,
                                    eventType: OfficialRunnerResult.THIRD_TO_HOME,
                                    eventTypeOut: OfficialRunnerResult.FORCE_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: true,
                                    isFieldersChoice: true
                                })
    
                            } else {
    
                                //Unless a 90% chance to succeed don't even run. Saying an average speed player has a 65% success rate. So many won't run.
                                let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner3B.hittingRatings.speed, DEFAULT_SUCCESS - 30)
    
                                if (chanceRunnerSafe > 90) {
    
                                    this.runnerToBaseWithThrow({
                                        gameRNG: gameRNG,
                                        runnerResult: runnerResult,
                                        allEvents: allEvents,
                                        runnerEvents: events,
                                        runnerEvent: runner3bRA,
                                        hitterEvent: hitterRA,
                                        defensiveCredits: defensiveCredits,
                                        start: BaseResult.THIRD,
                                        end: BaseResult.HOME,
                                        eventType: OfficialRunnerResult.THIRD_TO_HOME,
                                        eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                                        leagueAverage: leagueAverages,
                                        pitcher: pitcher,
                                        offense: offense,
                                        pitchIndex: pitchIndex,
                                        defense: defense,
                                        throwFrom: fielderPlayer,
                                        chanceRunnerSafe: chanceRunnerSafe,
                                        isForce: false,
                                        isFieldersChoice: true
                                    })
    
                                }
                            }

                        }
    
                        //Handle runner on second
                        if (runner2B != undefined) {
    
                            runner2bRA.isForce = (runner1B != undefined)
    
                            if (runner2bRA.isForce) {
    
                                let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner2B.hittingRatings.speed, 1) //low chance
    
                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: runner2bRA,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.SECOND,
                                    end: BaseResult.THIRD,
                                    eventType: OfficialRunnerResult.SECOND_TO_THIRD,
                                    eventTypeOut: OfficialRunnerResult.FORCE_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: true,
                                    isFieldersChoice: true
                                })
    
                            } else {
    
                                //If there's a runner on third or it's hit to the right side of the infield then go without a throw 
                                if (runner3bRA || (fielderPlayer.currentPosition == Position.SECOND_BASE || fielderPlayer.currentPosition == Position.FIRST_BASE || fielderPlayer.currentPosition == Position.CATCHER) ) {
                                    //If hit to right side of infield then go without a throw
                                    this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, false)
                                }
    
                                //Otherwise just stay there
                            }
    
                        }
    
                        //Handle runner on 1B
                        if (runner1B != undefined) {
    
                            runner1bRA.isForce = true
    
                            if (this.getThrowCount(events) < 1) {

                                let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner1B.hittingRatings.speed, 1) //low chance

                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: runner1bRA,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.FIRST,
                                    end: BaseResult.SECOND,
                                    eventType: OfficialRunnerResult.FIRST_TO_SECOND,
                                    eventTypeOut: OfficialRunnerResult.FORCE_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: true,
                                    isFieldersChoice: true
                                })

                            } else {

                                //Throw already made. Just advance.
                                this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, true)

                            }

                        }

                        //Handle hitter
                        if (this.getThrowCount(events) > 0) {
                            //We've already made a throw

                            //Try for double play. Always go for hitter for now.
                            let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, hitter.hittingRatings.speed, 75) //high chance they are safe
    
                            this.runnerToBaseWithThrow({
                                gameRNG: gameRNG,
                                runnerResult: runnerResult,
                                allEvents: allEvents,
                                runnerEvents: events,
                                runnerEvent: hitterRA,
                                hitterEvent: hitterRA,
                                defensiveCredits: defensiveCredits,
                                start: BaseResult.HOME,
                                end: BaseResult.FIRST,
                                eventType: OfficialRunnerResult.HOME_TO_FIRST,
                                eventTypeOut: OfficialRunnerResult.FORCE_OUT,
                                leagueAverage: leagueAverages,
                                defense: defense,
                                pitcher: pitcher,
                                offense: offense,
                                pitchIndex: pitchIndex,
                                throwFrom: fielderPlayer,
                                chanceRunnerSafe: chanceRunnerSafe,
                                isForce: true,
                                isFieldersChoice: true
                            })


                        } else {

                            //Throw is to 1B
                            let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, hitter.hittingRatings.speed, 1) //low chance
        
                            this.runnerToBaseWithThrow({
                                gameRNG: gameRNG,
                                runnerResult: runnerResult,
                                allEvents: allEvents,
                                runnerEvents: events,
                                runnerEvent: hitterRA,
                                hitterEvent: hitterRA,
                                defensiveCredits: defensiveCredits,
                                start: BaseResult.HOME,
                                end: BaseResult.FIRST,
                                eventType: OfficialRunnerResult.HOME_TO_FIRST,
                                eventTypeOut: OfficialRunnerResult.FORCE_OUT,
                                leagueAverage: leagueAverages,
                                pitcher: pitcher,
                                offense: offense,
                                pitchIndex: pitchIndex,
                                defense: defense,
                                throwFrom: fielderPlayer,
                                chanceRunnerSafe: chanceRunnerSafe,
                                isForce: true,
                                isFieldersChoice: false
                            })
                        }
    
                        break
    
                    }
        
                    break
    
                case PlayResult.BB:
    
                    //Move runners
                    if (runnerResult.third != undefined && runnerResult.second != undefined && runnerResult.first != undefined) {
                        this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, true)
                    }
    
                    if (runnerResult.second != undefined && runnerResult.first != undefined) {
                        this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, true)
                    }
    
                    if (runnerResult.first != undefined) {
                        this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, true)
                    }
    
                    this.runnerToBase(runnerResult, hitterRA, BaseResult.HOME, BaseResult.FIRST, PlayResult.BB, true)
    
                    break
    
                case PlayResult.HIT_BY_PITCH:
    
                    //Move runners
                    if (runnerResult.third != undefined && runnerResult.second != undefined && runnerResult.first != undefined) {
                        this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, true)
                    }
    
                    if (runnerResult.second != undefined && runnerResult.first != undefined) {
                        this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, true)
                    }
    
                    if (runnerResult.first != undefined) {
                        this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, true)
                    }
    
                    this.runnerToBase(runnerResult, hitterRA, BaseResult.HOME, BaseResult.FIRST, PlayResult.HIT_BY_PITCH, true)
    
                    break
    
                case PlayResult.SINGLE:
    
                    //Move runners
                    if (runnerResult.third != undefined) {
                        this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, (runnerResult.first != undefined && runnerResult.second != undefined) )
                    }
    
                    if (runnerResult.second != undefined) {
    
                        //Runner on 2nd moves 1 base by default.
                        //score if hit to outfield. not shallow outfield unless fast runner. roll for outfield throw.
                        this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, runnerResult.first != undefined )
    
                        if (this.isToOF(fielderPlayer?.currentPosition) && shallowDeep != ShallowDeep.SHALLOW) {
    
                            let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner2B.hittingRatings.speed, 75) //high chance they are safe
    
                            if (chanceRunnerSafe > 90) {
    
                                //Add new event for throw result.
                                let clone:RunnerEvent = JSON.parse(JSON.stringify(runner2bRA))
    
                                clone.movement.start = BaseResult.THIRD
                                clone.movement.end = undefined

                                events.push(clone)
    
                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: clone,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.THIRD,
                                    end: BaseResult.HOME,
                                    eventType: OfficialRunnerResult.THIRD_TO_HOME,
                                    eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: false,
                                    isFieldersChoice: false
                                })
        
                            }
    
                        }
                    }
    
                    if (runnerResult.first != undefined) {
    
                        //Advance to 2B by default
                        this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, true )
    
                        //go to third if fast runner. roll for outfield throw. 
                        if (fielderPlayer.currentPosition == Position.RIGHT_FIELD || fielderPlayer.currentPosition == Position.CENTER_FIELD) {
    
                            let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner1B.hittingRatings.speed, 75) //high chance they are safe
    
                            if (chanceRunnerSafe > 90) {
    
                                //Add new event for throw result.
                                let clone:RunnerEvent = JSON.parse(JSON.stringify(runner1bRA))
    
                                clone.movement.start = BaseResult.SECOND
                                clone.movement.end = undefined

                                events.push(clone)
    
                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: clone,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.SECOND,
                                    end: BaseResult.THIRD,
                                    eventType: OfficialRunnerResult.SECOND_TO_THIRD,
                                    eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: false,
                                    isFieldersChoice: false
                                })
        
                            }
    
                        }
    
                    }
    
                    //Hitter goes to 1B
                    this.runnerToBase(runnerResult, hitterRA, BaseResult.HOME, BaseResult.FIRST, PlayResult.SINGLE, true)
    
                    break
    
                case PlayResult.DOUBLE:
    
                    //Move runners. Third and second score.
                    this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, (runnerResult.first != undefined && runnerResult.second != undefined))
                    this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.HOME, OfficialRunnerResult.SECOND_TO_HOME, false)
    
                    if (runnerResult.first != undefined) {
    
                        //Advance to 3B by default
                        this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.THIRD, OfficialRunnerResult.FIRST_TO_THIRD, false)
    
                        //Score unless hit to shallow OF. roll for outfield throw. 
                        if (shallowDeep != ShallowDeep.SHALLOW) {
    
                            let chanceRunnerSafe = this.getChanceRunnerSafe(leagueAverages, fielderPlayer.hittingRatings.arm, runner1B.hittingRatings.speed, 60) //kinda high chance they are safe
    
                            if (chanceRunnerSafe > 90) {
    
                                //Add new event for throw result.
                                let clone:RunnerEvent = JSON.parse(JSON.stringify(runner1bRA))
    
                                clone.movement.start = BaseResult.THIRD
                                clone.movement.end = undefined
                                
                                events.push(clone)
    
                                this.runnerToBaseWithThrow({
                                    gameRNG: gameRNG,
                                    runnerResult: runnerResult,
                                    allEvents: allEvents,
                                    runnerEvents: events,
                                    runnerEvent: clone,
                                    hitterEvent: hitterRA,
                                    defensiveCredits: defensiveCredits,
                                    start: BaseResult.THIRD,
                                    end: BaseResult.HOME,
                                    eventType: OfficialRunnerResult.THIRD_TO_HOME,
                                    eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                                    leagueAverage: leagueAverages,
                                    pitcher: pitcher,
                                    offense: offense,
                                    pitchIndex: pitchIndex,
                                    defense: defense,
                                    throwFrom: fielderPlayer,
                                    chanceRunnerSafe: chanceRunnerSafe,
                                    isForce: false,
                                    isFieldersChoice: false
                                })
        
                            }
    
                        }
    
                    }
    
                    this.runnerToBase(runnerResult, hitterRA, BaseResult.HOME, BaseResult.SECOND, PlayResult.DOUBLE, true)
    
                    break
    
                case PlayResult.TRIPLE:
    
                    //Move runners
                    this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, true)
                    this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.HOME, OfficialRunnerResult.SECOND_TO_HOME, true)
                    this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.HOME, OfficialRunnerResult.FIRST_TO_HOME, true)
    
                    this.runnerToBase(runnerResult, hitterRA, BaseResult.HOME, BaseResult.THIRD, PlayResult.TRIPLE, true)
    
                    break
    
                case PlayResult.HR:
    
                    this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, true)
                    this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.HOME, OfficialRunnerResult.SECOND_TO_HOME, true)
                    this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.HOME, OfficialRunnerResult.FIRST_TO_HOME, true)
    
                    this.runnerToBase(runnerResult, hitterRA, BaseResult.HOME, BaseResult.HOME, PlayResult.HR, true)
    
                    break
    
            }

        } catch(ex) {
            if (!(ex instanceof InningEndingEvent)) throw ex
        }

        return this.filterNonEvents(events, hitter)


    }

    stealBases(runner1B:GamePlayer, runner2B: GamePlayer, runner3B: GamePlayer, gameRNG, runnerResult:RunnerResult, allEvents:RunnerEvent[], runnerEvents:RunnerEvent[], defensiveCredits:DefensiveCredit[], leagueAverages:LeagueAverage, catcher:GamePlayer, defense:TeamInfo, offense:TeamInfo, pitcher:GamePlayer, pitchIndex:number) {

        let runners = [runner1B, runner2B, runner3B].filter( r => r != undefined)

        if (runnerEvents.length > 0) {

            for (let re of runnerEvents) {
        
                //Would runner steal?
                if (re.movement.start == BaseResult.THIRD) continue //runner from third wouldn't.
                if (re.movement.start == BaseResult.SECOND && runnerResult.third) continue //runner from second wouldn't if a runner on third
                if (re.movement.start ==  BaseResult.FIRST && runnerResult.second && runnerResult.first) continue//runner from first either
    
                //If runner is on first and the runner on second isn't stealing then no attempt.
                if (re.movement.start == BaseResult.FIRST && runnerEvents.find(re => re.movement.start == BaseResult.SECOND)?.isSBAttempt == false) continue
    
                let SAFE_CHANCE = 65 //by default for 3B
                if (re.movement.start == BaseResult.FIRST) SAFE_CHANCE = 75 //if they're stealing second
    
    
                //If the runner on second is stealing then the runner on first goes for free
                if (re.movement.start ==  BaseResult.FIRST && runnerEvents.find( re => re?.movement?.start)?.isSBAttempt) {
    
                    this.runnerToBase(runnerResult, re, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.STOLEN_BASE_2B, false)

                    re.isSBAttempt = true
                    re.isSB = true
                    re.pitchIndex = pitchIndex
    
                } else {
    
                    let runner = runners.find( r => r._id == re.runner._id)

                    //Is runner going to steal?
                    let chanceRunnerSafe = this.getStolenBaseSafe(leagueAverages, catcher.hittingRatings.arm, runner.hittingRatings.speed, runner.hittingRatings.steals, SAFE_CHANCE) 
    
                    //Don't steal every time. 
                    let jumpRoll = this.rollService.getRoll(gameRNG, 0, 999)

                    let endBase
                    let eventType
                    let eventTypeOut
        
                    //Are they doing it?
                    if (jumpRoll > 965 && chanceRunnerSafe >= 72) {

                        if (re.movement.start == BaseResult.SECOND) {
                            endBase = BaseResult.THIRD
                            eventType = OfficialRunnerResult.STOLEN_BASE_3B
                            eventTypeOut = OfficialRunnerResult.CAUGHT_STEALING_3B
                        } else if (re.movement.start == BaseResult.FIRST) {
                            endBase = BaseResult.SECOND
                            eventType = OfficialRunnerResult.STOLEN_BASE_2B
                            eventTypeOut = OfficialRunnerResult.CAUGHT_STEALING_2B
                        }
    
                        this.runnerToBaseWithThrow({
                            gameRNG: gameRNG,
                            runnerResult: runnerResult,
                            allEvents: allEvents,
                            runnerEvents: runnerEvents,
                            runnerEvent: re,
                            hitterEvent: undefined,
                            defensiveCredits: defensiveCredits,
                            start: re.movement.start,
                            end: endBase,
                            eventType: eventType,
                            eventTypeOut: eventTypeOut,
                            leagueAverage: leagueAverages,
                            defense: defense,
                            offense: offense,
                            pitcher: pitcher,
                            throwFrom: catcher,
                            chanceRunnerSafe: chanceRunnerSafe,
                            isForce: false,
                            isFieldersChoice: false,
                            pitchIndex: pitchIndex
                        })
    
                        re.isSBAttempt = true
    
                        if (re.movement.isOut) {
                            
                            re.isCS = true
    
                            //Credit the catcher
                            defensiveCredits.push({
                                _id: catcher._id,
                                type: DefenseCreditType.CAUGHT_STEALING
                            })
    
                        } else {
                            re.isSB = true
                        }
                        
                    }
                }
            }

        }

    }

    runnerToBaseWithThrow(command:RunnerThrowCommand) {

        if (command.runnerEvent) {

            command.runnerEvent.movement.start = command.start

            if (this.getThrowCount(command.runnerEvents) < 1) {
    
                let throwTo:GamePlayer = command.defense.players.find( p => p.currentPosition == this.getPositionCoveringBase(command.throwFrom.currentPosition, command.end))
                let throwRoll:ThrowRoll = this.getThrowResult(command.gameRNG, command.chanceRunnerSafe)
    
                if (throwTo._id != command.throwFrom._id) {
                    command.runnerEvent.throw = {
                        result: throwRoll.result,
                        from: { _id: command.throwFrom._id, position: command.throwFrom.currentPosition},
                        to: { _id: throwTo._id, position: throwTo.currentPosition},
                    }
                }

                if (throwRoll.result == ThrowResult.OUT) {
                    
                    command.runnerEvent.eventType = command.eventTypeOut

                    //Credit the thrower
                    if (throwTo._id != command.throwFrom._id) {
                        command.defensiveCredits.push({
                            _id: command.throwFrom._id,
                            type: DefenseCreditType.ASSIST
                        })
                    }

                    if (command.hitterEvent) {
                        command.hitterEvent.isFC = command.isFieldersChoice
                    }

                    this.runnerIsOut(command.runnerResult, command.allEvents, command.defensiveCredits, throwTo, command.runnerEvent, this.getTotalOuts(command.runnerEvents), command.end)

                } else {

                    //Runner is safe. Move runner to base.
                    this.runnerToBase(command.runnerResult, command.runnerEvent, command.start, command.end, command.eventType, command.isForce)

                    //Was there an error? Lowest rolls
                    if (throwRoll.roll < 10) {

                        command.runnerEvent.isError = true

                        let roll = throwRoll.roll

                        //Was it on the throw or on the catch?
                        if (APPLY_PLAYER_CHANGES) {

                            let armChange = this.getChange(command.leagueAverage.hittingRatings.arm, this._getAverage([command.throwFrom.hittingRatings.arm, command.throwFrom.hittingRatings.defense]))
                            let receivingChange = this.getChange(command.leagueAverage.hittingRatings.defense, command.throwFrom.hittingRatings.defense)
    
                            roll = throwRoll.roll + (throwRoll.roll * (armChange * PLAYER_CHANGE_SCALE)) - (throwRoll.roll * (receivingChange * PLAYER_CHANGE_SCALE))
                        }


                        if (roll >= 5 && throwTo._id != command.throwFrom._id) {

                            //Thrower's fault
                            command.defensiveCredits.push({
                                _id: command.throwFrom._id,
                                type: DefenseCreditType.ERROR
                            })

                        } else {
                            //Receiver's fault
                            command.defensiveCredits.push({
                                _id: throwTo._id,
                                type: DefenseCreditType.ERROR
                            })
                        }

                        //Move all runnners up
                        let errorEvents:RunnerEvent[] = this.initRunnerEvents(command.pitcher, 
                            undefined,
                            command.offense.players.find( p => p._id == command.runnerResult.first), 
                            command.offense.players.find( p => p._id == command.runnerResult.second), 
                            command.offense.players.find( p => p._id == command.runnerResult.third), 
                            command.pitchIndex
                        )
            
                        for (let ev of errorEvents) {
                            ev.isError = true
                        }


                        this.advanceRunnersOneBase(command.runnerResult, errorEvents, false)

                        command.runnerEvents.push(...this.filterNonEvents(errorEvents, undefined))

                    } 

                    command.runnerEvent.eventType = command.eventType
                }

            } else {
                this.runnerToBase(command.runnerResult, command.runnerEvent, command.start, command.end, command.eventType, command.isForce)
            }

        }
        
    }

    advanceRunnersOneBase(runnerResult:RunnerResult, events:RunnerEvent[], isForce:boolean) {

        let runner3bRA = events.find(e => e.movement?.start == BaseResult.THIRD && runnerResult.third == e.runner._id)
        let runner2bRA = events.find(e => e.movement?.start == BaseResult.SECOND && runnerResult.second == e.runner._id)
        let runner1bRA = events.find(e => e.movement?.start == BaseResult.FIRST && runnerResult.first == e.runner._id)

        //Advance runners one base
        this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, isForce)
        this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, isForce)
        this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, isForce)
    }

    advanceOtherRunnersOneBase(runnerResult:RunnerResult, events:RunnerEvent[], runner:RunnerEvent, isForce:boolean) {

        let runner3bRA = events.find(e => e.movement?.start == BaseResult.THIRD && runnerResult.third == e.runner._id)
        let runner2bRA = events.find(e => e.movement?.start == BaseResult.SECOND && runnerResult.second == e.runner._id)
        let runner1bRA = events.find(e => e.movement?.start == BaseResult.FIRST && runnerResult.first == e.runner._id)

        //Advance runners one base
        if (runner.runner._id != runner3bRA?.runner._id) {
            this.runnerToBase(runnerResult, runner3bRA, BaseResult.THIRD, BaseResult.HOME, OfficialRunnerResult.THIRD_TO_HOME, isForce)
        }

        if (runner.runner._id != runner2bRA?.runner._id) {
            this.runnerToBase(runnerResult, runner2bRA, BaseResult.SECOND, BaseResult.THIRD, OfficialRunnerResult.SECOND_TO_THIRD, isForce)
        }

        if (runner.runner._id != runner1bRA?.runner._id) {
            this.runnerToBase(runnerResult, runner1bRA, BaseResult.FIRST, BaseResult.SECOND, OfficialRunnerResult.FIRST_TO_SECOND, isForce)
        }

    }

    isRunUnearned(inningRunnerEvents:RunnerEvent[], runnerEvent:RunnerEvent) : boolean {

        let errorsBeforeScoring = false
        let outs = 0
    
        // Iterate through the inning events to check the situation
        for (let event of inningRunnerEvents) {

            // Count outs
            if (event.movement?.isOut) {
                outs++
            }
    
            // // If the current event is the one being analyzed, check if it's a scoring event
            // if (event === runnerEvent && event.isScoringEvent) {

            //     // If there was an error or passed ball before the runner scored
            //     if (errorsBeforeScoring || event.isPassedBall || event.isWildPitch) {
            //         return true; // Unearned run
            //     }
    
            //     // If the runner reached base due to an error, it's unearned
            //     if (event.eventType === PlayResult.Error || event.isFieldersChoice) {
            //         return true; // Unearned run
            //     }
    
            //     // If the runner scores after 3 outs should have been recorded, it's unearned
            //     if (outs >= 3) {
            //         return true; // Unearned run
            //     }
            // }
    
            // // Track if errors occurred before scoring
            // if (event.eventType === PlayResult.Error) {
            //     errorsBeforeScoring = true;
            // }
    
            // // Stop evaluating once 3 outs have occurred
            // if (outs >= 3) {
            //     break;
            // }
        }
    
        // If no condition for an unearned run was met, return false (run is earned)
        return false
    }

    runnerIsOut(runnerResult:RunnerResult, allEvents:RunnerEvent[], defensiveCredits:DefensiveCredit[], fielderPlayer:GamePlayer, runnerEvent:RunnerEvent, outNumber:number, outBase:BaseResult) {

        if (runnerEvent) {

            switch(runnerEvent.movement.start) {
                case BaseResult.FIRST:
                    runnerResult.first = undefined
                    break
                case BaseResult.SECOND:
                    runnerResult.second = undefined
                    break
                case BaseResult.THIRD:
                    runnerResult.third = undefined
                    break
            }

            runnerEvent.movement.isOut = true
            runnerEvent.movement.outNumber = outNumber
            runnerEvent.movement.outBase = outBase
            runnerEvent.movement.end = outBase

            runnerResult.out.push(runnerEvent.runner._id)

            if (this.isRunUnearned(allEvents, runnerEvent)) {
                runnerEvent.isUnearned = true
            }

            //Credit fielder with putout
            defensiveCredits.push({
                _id: fielderPlayer._id,
                type: DefenseCreditType.PUTOUT
            })

            this.validateInningOver(allEvents)

        }

    }

    runnerToBase(runnerResult:RunnerResult, runnerEvent:RunnerEvent, start:BaseResult, end:BaseResult, eventType: PlayResult|OfficialRunnerResult, isForce:boolean) {
        
        let isScoringEvent = end == BaseResult.HOME

        if (runnerEvent) {
            
            runnerEvent.movement.start = start
            runnerEvent.movement.end = end
            runnerEvent.eventType = eventType
            runnerEvent.isScoringEvent = isScoringEvent        
            runnerEvent.isForce = isForce

            switch(start) {
                case BaseResult.FIRST:
                    runnerResult.first = undefined
                    break
                case BaseResult.SECOND:
                    runnerResult.second = undefined
                    break
                case BaseResult.THIRD:
                    runnerResult.third = undefined
                    break
            }


            switch(end) {
                case BaseResult.FIRST:
                    runnerResult.first = runnerEvent.runner._id
                    break
                case BaseResult.SECOND:
                    runnerResult.second = runnerEvent.runner._id
                    break
                case BaseResult.THIRD:
                    runnerResult.third = runnerEvent.runner._id
                    break
            }

            if (isScoringEvent) {
                runnerResult.scored.push(runnerEvent.runner._id)
            }


        }

    }

    runnerOutAtBase(runnerEvent:RunnerEvent, end:BaseResult, isForce:boolean, isFieldersChoice:boolean, defense:TeamInfo, throwFrom:GamePlayer, outs:number) {

        let throwTo:GamePlayer = defense.players.find( p => p.currentPosition == this.getPositionCoveringBase(throwFrom.currentPosition, end))

        outs++
        runnerEvent.movement.end = end
        runnerEvent.eventType = isForce ? OfficialRunnerResult.FORCE_OUT : OfficialRunnerResult.TAGGED_OUT
        runnerEvent.isForce = isForce
        runnerEvent.movement.isOut = true
        runnerEvent.movement.outNumber = outs
        runnerEvent.isFC = isFieldersChoice

        runnerEvent.throw = {
            result: ThrowResult.OUT,
            from: { _id: throwFrom._id, position: throwFrom.currentPosition},
            to: { _id: throwTo._id, position: throwTo.currentPosition}
        }

    }

    runnersTagWithThrow(gameRNG, runnerResult:RunnerResult, leagueAverages:LeagueAverage, allEvents:RunnerEvent[], runnerEvents:RunnerEvent[], defensiveCredits:DefensiveCredit[], defense:TeamInfo, offense:TeamInfo, pitcher:GamePlayer, fielderPlayer:GamePlayer, runner1bRA:RunnerEvent, runner2bRA:RunnerEvent, runner3bRA:RunnerEvent, chanceRunnerSafe:number, pitchIndex:number ) {

        let hitterRA = runnerEvents.find(re => re.movement.start == BaseResult.HOME)

        if (runnerResult.third) {

            this.runnerToBaseWithThrow({
                gameRNG: gameRNG,
                runnerResult: runnerResult,
                allEvents: allEvents,
                runnerEvents: runnerEvents,
                runnerEvent: runner3bRA,
                hitterEvent: hitterRA,
                defensiveCredits: defensiveCredits,
                start: BaseResult.THIRD,
                end: BaseResult.HOME,
                eventType: OfficialRunnerResult.TAGGED_THIRD_TO_HOME,
                eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                leagueAverage: leagueAverages,
                pitcher: pitcher,
                offense: offense,
                pitchIndex: pitchIndex,
                defense: defense,
                throwFrom: fielderPlayer,
                chanceRunnerSafe: chanceRunnerSafe,
                isForce: false,
                isFieldersChoice: false
            })

        }

        if (runnerResult.second) {

            this.runnerToBaseWithThrow({
                gameRNG: gameRNG,
                runnerResult: runnerResult,
                allEvents: allEvents,
                runnerEvents: runnerEvents,
                runnerEvent: runner2bRA,
                hitterEvent: hitterRA,
                defensiveCredits: defensiveCredits,
                start: BaseResult.SECOND,
                end: BaseResult.THIRD,
                eventType: OfficialRunnerResult.TAGGED_SECOND_TO_THIRD,
                eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                leagueAverage: leagueAverages,
                pitcher: pitcher,
                offense: offense,
                pitchIndex: pitchIndex,
                defense: defense,
                throwFrom: fielderPlayer,
                chanceRunnerSafe: chanceRunnerSafe,
                isForce: false,
                isFieldersChoice: false
            })

        }

        if (runnerResult.first) {

            this.runnerToBaseWithThrow({
                gameRNG: gameRNG,
                runnerResult: runnerResult,
                allEvents: allEvents,
                runnerEvents: runnerEvents,
                runnerEvent: runner1bRA,
                hitterEvent: hitterRA,
                defensiveCredits: defensiveCredits,
                start: BaseResult.FIRST,
                end: BaseResult.SECOND,
                eventType: OfficialRunnerResult.TAGGED_FIRST_TO_SECOND,
                eventTypeOut: OfficialRunnerResult.TAGGED_OUT,
                leagueAverage: leagueAverages,
                pitcher: pitcher,
                offense: offense,
                pitchIndex: pitchIndex,
                defense: defense,
                throwFrom: fielderPlayer,
                chanceRunnerSafe: chanceRunnerSafe, 
                isForce: false,
                isFieldersChoice: false
            })

        }
    }

    getChanceRunnerSafe(leagueAverages: LeagueAverage, armRating:number, runnerSpeed:number, defaultSuccess:number) {

        let fielderChange = this.getChange(leagueAverages.hittingRatings.arm, armRating)
        let runnerChange = this.getChange(leagueAverages.hittingRatings.speed, runnerSpeed)

        //Take the default success rate and apply the fielder and runner's changes.
        //Return the % chance that the runner is out.

        if (APPLY_PLAYER_CHANGES) {
            return this.applyMinMaxToNumber(Math.round(defaultSuccess - (defaultSuccess * fielderChange * PLAYER_CHANGE_SCALE) + (defaultSuccess * runnerChange  * PLAYER_CHANGE_SCALE)), 0, 99)
        } else {
            return this.applyMinMaxToNumber(Math.round(defaultSuccess), 0, 99)
        }


    }

    getStolenBaseSafe(leagueAverages: LeagueAverage, armRating:number, runnerSpeed:number, runnerSteals:number, defaultSuccess:number) {

        let fielderChange = this.getChange(leagueAverages.hittingRatings.arm, armRating)
        let runnerSpeedChange = this.getChange(leagueAverages.hittingRatings.speed, runnerSpeed)
        let runnerStealsChange = this.getChange(leagueAverages.hittingRatings.steals, runnerSteals)

        //Take the default success rate and apply the fielder and runner's changes.
        //Return the % chance that the runner is out.
        if (APPLY_PLAYER_CHANGES) {
            return this.applyMinMaxToNumber(Math.round(defaultSuccess - (defaultSuccess * fielderChange * PLAYER_CHANGE_SCALE) + (defaultSuccess * runnerSpeedChange * PLAYER_CHANGE_SCALE) + (defaultSuccess * runnerStealsChange * PLAYER_CHANGE_SCALE)), 0, 99)
        } else {
            return this.applyMinMaxToNumber(Math.round(defaultSuccess), 0, 99)
        }

    }

    getThrowResult(gameRNG, overallSafeChance:number) : ThrowRoll {

        let roll = this.rollService.getRoll(gameRNG, 1, 100)

        let result

        if (roll > overallSafeChance) {
            //out
            result = ThrowResult.OUT
        } else {
            //safe
            result = ThrowResult.SAFE
        }

        return {
            roll: roll,
            result: result
        }
    }

    isInAir(contact: Contact) {
        return contact == Contact.FLY_BALL || contact == Contact.LINE_DRIVE
    }

    isToInfielder(fielder: Position) {

        switch (fielder) {
            case Position.PITCHER:
            case Position.CATCHER:
            case Position.FIRST_BASE:
            case Position.SECOND_BASE:
            case Position.THIRD_BASE:
            case Position.SHORTSTOP:
                return true
        }

        return false

    }

    isToOF(fielder: Position) {

        switch (fielder) {
            case Position.LEFT_FIELD:
            case Position.RIGHT_FIELD:
            case Position.CENTER_FIELD:
                return true
        }

        return false

    }

    isHit(playResult: PlayResult) {

        switch (playResult) {
            case PlayResult.SINGLE:
            case PlayResult.DOUBLE:
            case PlayResult.TRIPLE:
            case PlayResult.HR:
                return true
        }

        return false

    }

    getOfficialPlayResult(playResult: PlayResult, contact: Contact, shallowDeep: ShallowDeep, fielder: Position, runnerEvents: RunnerEvent[]) {

        switch (playResult) {

            case PlayResult.STRIKEOUT:
                return OfficialPlayResult.STRIKEOUT

            case PlayResult.OUT:

                if (contact == Contact.GROUNDBALL) {

                    //Check for double play
                    if (contact == Contact.GROUNDBALL && runnerEvents.filter( re => re?.movement?.isOut == true && !re.isCS).length > 2) {
                        return OfficialPlayResult.GROUNDED_INTO_DP
                    }


                    if (runnerEvents.find( re => re.movement.start == BaseResult.HOME && re.isFC == true)) {
                        return OfficialPlayResult.FIELDERS_CHOICE
                    } else {
                        return OfficialPlayResult.GROUNDOUT
                    }

                }
                if (contact == Contact.FLY_BALL && this.isToInfielder(fielder)) return OfficialPlayResult.POP_OUT
                if (contact == Contact.FLY_BALL && this.isToOF(fielder)) return OfficialPlayResult.FLYOUT

                if (contact == Contact.LINE_DRIVE) return OfficialPlayResult.FLYOUT

            case PlayResult.BB:
                return OfficialPlayResult.WALK

            case PlayResult.HIT_BY_PITCH:
                return OfficialPlayResult.HIT_BY_PITCH

            case PlayResult.SINGLE:
                return OfficialPlayResult.SINGLE

            case PlayResult.DOUBLE:
                return OfficialPlayResult.DOUBLE

            case PlayResult.TRIPLE:
                return OfficialPlayResult.TRIPLE

            case PlayResult.HR:
                return OfficialPlayResult.HOME_RUN
            
            case PlayResult.ERROR:
                return OfficialPlayResult.REACHED_ON_ERROR

        }

    }

    getFielder(gameRNG, leagueAverages: LeagueAverage, hitterHandedness:Handedness): Position {

        let rollChart = this.rollChartService.getFielderChanceRollChart(hitterHandedness == Handedness.R ? leagueAverages.fielderChanceR : leagueAverages.fielderChanceL)

        return rollChart.entries.get(this.rollService.getRoll(gameRNG, 0, 99)) as Position

    }

    getOutfielder(gameRNG): Position {

        //Eventually this should account for handedness of hitter
        let rollChart = this.rollChartService.getFielderChanceRollChart({
            first: 0,
            second: 0,
            third: 0,
            catcher: 0,
            shortstop: 0,
            leftField: 33,
            centerField: 34,
            rightField: 33,
            pitcher: 0
        })

        return rollChart.entries.get(this.rollService.getRoll(gameRNG, 0, 99)) as Position

    }

    getShallowDeep(gameRNG: any, leagueAverages: LeagueAverage): ShallowDeep {

        let rollChart = this.rollChartService.getShallowDeepRollChart(leagueAverages.shallowDeepChance)

        return rollChart.entries.get(this.rollService.getRoll(gameRNG, 0, 99)) as ShallowDeep

    }

    isInZone(gameRNG, locationQuality:number, inZoneRate:number) {

        //90% of the chance should be a coin-flip (better location doesn't necessarily mean a strike)
        //and also with pitchers with poor location skills they'll walk like 80% of players making it unplayable.
        let chance = this.rollService.getRollUnrounded(gameRNG, 0, 90)

        chance += (locationQuality / 99) * 10

        return chance >= (99 - inZoneRate)
    }

    getSwingResult(gameRNG, hitterChange: HitterChange, leagueAverage: LeagueAverage, inZone: boolean, pitchQuality: number, guessPitch:boolean): SwingResult {

        //How much better than average is the pitch quality?
        let pitchQualityChange = this.getChange(leagueAverage.pitchQuality, pitchQuality)

        //Look up swing rate based on count
        let swingRate = 0

        let swingRateAdjust = [] //value used to adjust overall swing rate equally between balls/strikes

        //Worse players swing more on balls, less often on low-quality strikes.
        if (inZone) {

            swingRate = leagueAverage.strikeSwingRate

            //Better players swing more on low-quality strikes,
            //Worse players swing less on low-quality strikes (because they are dumb).
            if (APPLY_PLAYER_CHANGES) {

                swingRateAdjust.push(hitterChange.plateDisiplineChange * PLAYER_CHANGE_SCALE)
                swingRateAdjust.push(pitchQualityChange * -1 * PLAYER_CHANGE_SCALE)

                if (guessPitch) {
                    swingRateAdjust.push(.3)
                }
            }

        } else {

            swingRate = leagueAverage.ballSwingRate

            //Better players swing less often on balls (unless 2 strikes)
            //Worse players swing more often on balls (because they are dumb).

            if (APPLY_PLAYER_CHANGES) {
                swingRateAdjust.push(hitterChange.plateDisiplineChange * -1 * PLAYER_CHANGE_SCALE )  //negative adjust
                swingRateAdjust.push(pitchQualityChange * PLAYER_CHANGE_SCALE) 

                if (guessPitch) {
                    swingRateAdjust.push(.3 * -1)
                }
            }
        }

        swingRate = this.rollChartService.applyChanges(swingRate, swingRateAdjust)


        //Roll die
        let die = this.rollService.getRollUnrounded(gameRNG, 0, 99)

        if (die >= 99 - swingRate) {

            //Swing
            let swingContactRate = inZone ? leagueAverage.zoneSwingContactRate : leagueAverage.chaseSwingContactRate //higher is better for pitcher

            //Increase or decrease chance based on hitter's contact rating and vsSameHand rating

            if (APPLY_PLAYER_CHANGES) {

                let swingContactRateAdjust = [
                    hitterChange.contactChange * -1 * PLAYER_CHANGE_SCALE, 
                    guessPitch ? -.2 : .2,
                    pitchQualityChange * PLAYER_CHANGE_SCALE
                ]

                swingContactRate = this.rollChartService.applyChanges(swingContactRate, swingContactRateAdjust)

            }


            let die2 = this.rollService.getRoll(gameRNG, 0, 99)

            if (die2 > swingContactRate) {

                //Swinging strike
                return SwingResult.STRIKE

            } else {

                //Made contact

                //Roll for fair/foul
                let die3 = this.rollService.getRoll(gameRNG, 0, 99)

                if (die3 > 99 - leagueAverage.foulRate) {
                    //Foul
                    return SwingResult.FOUL
                } else {
                    //Fair
                    return SwingResult.FAIR
                }
            }

        } else {

            //No swing
            return SwingResult.NO_SWING

        }

    }

    getIntentZone(rng) {
        const index = Math.floor(rng() * ALL_PITCH_ZONES.length)
        return ALL_PITCH_ZONES[index]
    }

    getActualZone(intentZone: PitchZone, locQ: number): PitchZone {

        // 67–99 => on target, 34–66 => off by 1 zone, 0–33 => off by 2 zones
        let missSize: 0 | 1 | 2 = 0
        if (locQ <= 33) missSize = 2
        else if (locQ <= 66) missSize = 1

        if (missSize === 0) return intentZone

        // Deterministic direction from locQ (no RNG)
        // 0=up, 1=down, 2=away, 3=inside
        const direction = locQ % 4

        // Parse intentZone like "LOW_AWAY"
        const [verticalText, horizontalText] = intentZone.split("_")

        // Convert to 0..2 indices
        let vertical: 0 | 1 | 2 =
            verticalText === "LOW" ? 0 :
            verticalText === "MID" ? 1 : 2

        let horizontal: 0 | 1 | 2 =
            horizontalText === "AWAY" ? 0 :
            horizontalText === "MIDDLE" ? 1 : 2

        // Apply miss
        let v = vertical
        let h = horizontal

        if (direction === 0) v = (v + missSize) as any       // up
        else if (direction === 1) v = (v - missSize) as any  // down
        else if (direction === 2) h = (h - missSize) as any  // away
        else h = (h + missSize) as any                       // inside

        // Clamp to 0..2
        if (v < 0) v = 0
        if (v > 2) v = 2
        if (h < 0) h = 0
        if (h > 2) h = 2

        // Convert back to PitchZone
        const newVerticalText = v === 0 ? "LOW" : v === 1 ? "MID" : "HIGH"
        const newHorizontalText = h === 0 ? "AWAY" : h === 1 ? "MIDDLE" : "INSIDE"

        return `${newVerticalText}_${newHorizontalText}` as PitchZone
    }

    getPowerQuality(gameRNG, powerChange: number): number {

        let roll =  this.rollService.getRollUnrounded(gameRNG, 0, 99)

        if (APPLY_PLAYER_CHANGES) {
            roll += (roll * powerChange * PLAYER_CHANGE_SCALE)
        }


        if (roll < 0) roll = 0
        if (roll > 99) roll = 99

        return parseFloat(roll.toFixed(2))

    }

    getLocationQuality(gameRNG, controlChange: number): number {

        let roll = this.rollService.getRollUnrounded(gameRNG, 0, 99)

        if (APPLY_PLAYER_CHANGES) {
            roll += (roll * controlChange * PLAYER_CHANGE_SCALE) 
        }

        if (roll < 0) roll = 0
        if (roll > 99) roll = 99

        return parseFloat(roll.toFixed(2))

    }

    getMovementQuality(gameRNG, movementChange: number): number {
        
        let roll =  this.rollService.getRollUnrounded(gameRNG, 0, 99)


        if (APPLY_PLAYER_CHANGES) {
            roll += (roll * movementChange * PLAYER_CHANGE_SCALE)
        }


        if (roll < 0) roll = 0
        if (roll > 99) roll = 99

        return parseFloat(roll.toFixed(2))

    }

    getPitchQuality(powerQuality: number, locationQuality: number, movementQuality: number) {
        return Math.round(this._getAverage([powerQuality, locationQuality, movementQuality]))
    }

    getHitQuality( gameRNG, pitchQualityChange: number, teamDefenseChange: number, fielderDefenseChange: number, contact: Contact, guessPitch: boolean ): number {

        const FULL_DEFENSE_BONUS = -200
        const FULL_PITCH_QUALITY_BONUS = -200

        let bonusRoll = 0

        bonusRoll += FULL_PITCH_QUALITY_BONUS * pitchQualityChange
        bonusRoll += (FULL_DEFENSE_BONUS / 2) * teamDefenseChange
        bonusRoll += FULL_DEFENSE_BONUS * fielderDefenseChange

        switch (contact) {
            case Contact.FLY_BALL: bonusRoll += 50; break
            case Contact.LINE_DRIVE: bonusRoll += 100; break
        }

        if (guessPitch) bonusRoll += 30

        const base = this.rollService.getRoll(gameRNG, 0, 999)
        const roll = base + bonusRoll

        // Clamp to [0, 999] so it's always valid.
        return Math.max(0, Math.min(999, Math.round(roll)))
    }





    logAtBat(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.atBats++
        pitchResult.atBats++
    }

    logWildPitch(pitchResult: PitchResultCount) {
        pitchResult.wildPitches++
    }

    logPassedBall(hitResult: HitResultCount) {
        hitResult.passedBalls++
    }

    logStolenBase(hitResult: HitResultCount) {
        hitResult.sb++
    }

    logStolenBaseAttempt(hitResult: HitResultCount) {
        hitResult.sbAttempts++
    }

    logCaughtStealing(hitResult: HitResultCount) {
        hitResult.cs++
    }

    logCSDefense(hitResult: HitResultCount) {
        hitResult.csDefense++
    }

    logAssist(hitResult: HitResultCount) {
        hitResult.assists++
    }

    logOutfieldAssist(hitResult: HitResultCount) {
        hitResult.outfieldAssists++
    }

    logPutout(hitResult: HitResultCount) {
        hitResult.po++
    }

    logErrors(hitResult: HitResultCount) {
        hitResult.e++
    }

    logDoublePlays(hitResult: HitResultCount) {
        hitResult.doublePlays++
    }

    logGIDP(hitResult: HitResultCount) {
        hitResult.gidp++
    }

    logHit(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.hits++
        pitchResult.hits++
    }

    logStrikeout(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.so++
        pitchResult.so++
    }

    logBB(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.bb++
        pitchResult.bb++
    }

    logHBP(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.hbp++
        pitchResult.hbp++
    }

    log1B(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.singles++
        pitchResult.singles++
    }

    log2B(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.doubles++
        pitchResult.doubles++
    }

    log3B(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.triples++
        pitchResult.triples++
    }

    logHR(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.homeRuns++
        pitchResult.homeRuns++
    }

    logGroundout(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.groundOuts++
        pitchResult.groundOuts++
    }

    logFlyout(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.flyOuts++
        pitchResult.flyOuts++
    }

    logOuts(pitchResult: PitchResultCount|HitResultCount, outs: number) {
        pitchResult.outs += outs
    }

    logLineout(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.lineOuts++
        pitchResult.lineOuts++
    }

    logGroundball(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.groundBalls++
        pitchResult.groundBalls++
    }

    logLineDrive(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.lineDrives++
        pitchResult.lineDrives++
    }

    logFlyBall(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.flyBalls++
        pitchResult.flyBalls++
    }

    logRuns(hitResult: HitResultCount, pitchResult: PitchResultCount) {
        hitResult.runs++
        pitchResult.runs++
    }

    logEarnedRuns(pitchResult: PitchResultCount) {
        pitchResult.er++ 
    }

    logLOB(hitResult: HitResultCount, toLog: number) {
        hitResult.lob += toLog
    }

    logRBI(hitResult: HitResultCount, rbi: number) {
        hitResult.rbi += rbi
    }

    logGidp(hitResult: HitResultCount) {
        hitResult.gidp++
    }

    isAtBat(playResult: OfficialPlayResult) {

        if (playResult == OfficialPlayResult.HIT_BY_PITCH) return false
        if (playResult == OfficialPlayResult.WALK) return false
        if (playResult == OfficialPlayResult.RUNNER_OUT) return false
        if (playResult == OfficialPlayResult.EJECTION) return false

        return true
    }

    

    getChange(a: number, b: number) {
        return this.rollChartService.getChange(a, b)
    }

    applyChange(value:number, change:number) {
        return this.rollChartService.applyChange(value, change)
    }

    private _getAverage(array: number[]) {
        return array.reduce((a, b) => a + b) / array.length
    }


}

interface StartGameCommand {
    game:Game, 
    home:Team, 
    homeTLS:TeamLeagueSeason, 
    homeTLSPlain,
    homePlayers:PlayerLeagueSeason[], 
    homePlssPlain,
    homeStartingPitcher:RotationPitcher, 
    away:Team, 
    awayTLS:TeamLeagueSeason, 
    awayTLSPlain,
    awayPlayers:PlayerLeagueSeason[], 
    awayPlssPlain,
    awayStartingPitcher:RotationPitcher,
    leagueAverages:LeagueAverage
    date:Date
}


interface SimPitchCommand {

    game:Game
    play:Play

    offense:TeamInfo
    defense:TeamInfo

    hitter:GamePlayer
    pitcher:GamePlayer

    hitterChange:HitterChange
    pitcherChange:PitcherChange

    catcher:GamePlayer

    halfInningRunnerEvents:RunnerEvent[]
    halfInning:HalfInning
    
    leagueAverages: LeagueAverage

    matchupHandedness:MatchupHandedness

    rng:any

}



interface RunnerThrowCommand {
    gameRNG
    runnerResult:RunnerResult
    allEvents:RunnerEvent[]
    runnerEvents:RunnerEvent[]
    runnerEvent:RunnerEvent
    hitterEvent:RunnerEvent
    defensiveCredits:DefensiveCredit[]
    start:BaseResult
    end:BaseResult
    eventType: PlayResult|OfficialRunnerResult
    eventTypeOut: PlayResult|OfficialRunnerResult
    leagueAverage:LeagueAverage
    pitcher:GamePlayer
    defense:TeamInfo
    offense:TeamInfo
    throwFrom:GamePlayer
    chanceRunnerSafe:number
    isForce:boolean
    isFieldersChoice:boolean
    pitchIndex:number
}


interface Game {
    _id: string

    away: TeamInfo
    home: TeamInfo

    count: Count
    score: Score
    halfInnings?: HalfInning[]

    playIndex: number
    leagueAverages?: LeagueAverage

    currentInning: number
    summary?: any

    isStarted: boolean
    isTopInning: boolean
    isComplete: boolean
    isFinished: boolean

    seasonId?: string
    season?: Season

    leagueId?: string
    league?: League

    winningPitcherId?: string
    losingPitcherId?: string

    winningTeamId?: string
    winningTeam?: Team

    losingTeamId?: string
    losingTeam?: Team

    teams?: Team[]

    currentSimDate?: Date
    startDate?: Date
    gameDate?: Date

    lastUpdated?: Date
    dateCreated?: Date
}

interface Season {
    _id: string

    isComplete: boolean
    isInitialized: boolean

    startDate: Date
    endDate?: Date

    lastUpdated?: Date
    dateCreated?: Date
}

interface Player {
    _id: string

    tokenId?: number
    transactionHash?: string

    firstName: string
    lastName: string

    readonly fullName: string
    readonly displayName: string

    primaryPosition: Position
    zodiacSign: string
    personalityType: PersonalityType

    ownerId?: string

    pitchingProfile: PitchingProfile
    hittingProfile: HittingProfile

    throws: Handedness
    hits: Handedness

    isRetired: boolean

    careerStats?: PlayerStatLines

    coverImageCid?: string

    stamina: number
    overallRating: number

    pitchRatings: PitchRatings
    hittingRatings: HittingRatings

    potentialOverallRating: number
    potentialPitchRatings: PitchRatings
    potentialHittingRatings: HittingRatings

    totalExperience?: string

    age: number

    lastGamePitched?: Date
    lastGamePlayed?: Date
    lastTeamChange?: Date

    lastUpdated?: Date
    dateCreated?: Date
}

interface PlayerLeagueSeason {
    _id: string

    playerId?: string
    player?: Player

    leagueId?: string
    league?: League

    seasonId?: string
    season?: Season

    teamId?: string
    team?: Team

    seasonIndex: number

    primaryPosition: Position
    overallRating: number

    pitchRatings: PitchRatings
    hittingRatings: HittingRatings

    potentialOverallRating: number
    potentialPitchRatings: PitchRatings
    potentialHittingRatings: HittingRatings

    percentileRatings?: PlayerPercentileRatings
    stats?: PlayerStatLines

    age: number

    startDate?: Date
    endDate?: Date

    lastUpdated?: Date
    dateCreated?: Date
}

interface League {
    _id: string

    rank?: number
    name?: string

    baseDiamondReward?: string

    lastUpdated?: Date
    dateCreated?: Date
}


interface Team {
    _id: string

    mintKey?: string

    name?: string
    abbrev?: string

    userId?: string

    colors: Colors
    longTermRating: Rating
    seasonRating: Rating
    developmentStrategy: DevelopmentStrategy

    lastGamePlayed?: Date

    lastUpdated?: Date
    dateCreated?: Date
}


interface TeamLeagueSeason {
    _id: string

    teamId?: string
    team?: Team

    leagueId?: string
    league?: League

    seasonId?: string
    season?: Season

    financeSeason: FinanceSeason

    longTermRating: Rating
    seasonRating: Rating
    overallRecord: OverallRecord

    fanInterestShortTerm?: number
    fanInterestLongTerm?: number

    hasValidLineup: boolean

    lineups?: Lineup[]

    lastUpdated?: Date
    dateCreated?: Date
}

export {
    SimSharedService
}


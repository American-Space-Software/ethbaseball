import { injectable } from "inversify"

import { Game } from "../dto/game.js"
import {  RollChartService } from "./roll-chart-service.js"
import { SeedService } from "./data/seed-service.js"
import { RollChart } from "../dto/roll-chart.js"
import { StatService } from "./stat-service.js"
import { Handedness, PitchType, Position, PitchResultCount, HitResultCount, OfficialPlayResult, RunnerEvent, BaseRunners, GamePlayer, SimMatchupCommand, Play, MatchupHandedness, PlayResult, Contact, ShallowDeep, PitchLog, PitchResult, RunnerResult, TeamInfo, Pitch, SwingResult, PitchCount, LeagueAverage, ContactProfile, HittingProfile, PitchProfile, PitchingProfile, PitchRating,  BaseResult, OfficialRunnerResult, ThrowResult, DefensiveCredit, DefenseCreditType, ThrowRoll, BaseRunnerIds, InningEndingEvent, PitchRatings, HittingRatings, PitcherChange, HitterChange, PitchChange } from "./enums.js"

const APPLY_PLAYER_CHANGES = true


@injectable()
class RollService {

    constructor(
        private rollChartService: RollChartService,
        private seedService: SeedService,
        private statService:StatService
    ) { }

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

    simMatchup(command: SimMatchupCommand): Play {

        this.validateLineup(command.offense)
        this.validateLineup(command.defense)
        
        let hitter:GamePlayer = command.offense.players.find( p => p._id == command.hitterId)
        let pitcher = command.defense.players.find( p => p._id == command.pitcherId)
        let catcher:GamePlayer = command.defense.players.find( p => p.currentPosition == Position.CATCHER)

        this.validateRunners(command.runner1BId, command.runner2BId, command.runner3BId)

        //Handedness
        let matchupHandedness: MatchupHandedness = this.getMatchupHandedness(hitter, pitcher)

        let hitterChange:HitterChange   =  matchupHandedness.throws == Handedness.L ? hitter.hitterChange.vsL : hitter.hitterChange.vsR
        let pitcherChange:PitcherChange =  matchupHandedness.hits == Handedness.L ? pitcher.pitcherChange.vsL : pitcher.pitcherChange.vsR

        let playResult:PlayResult

        let contact:Contact
        let fielder:Position
        let fielderPlayer:GamePlayer

        let shallowDeep:ShallowDeep 

        let runnerEvents:RunnerEvent[] = []

        let runnerResult:RunnerResult = {
            first: command.runner1BId,
            second: command.runner2BId,
            third: command.runner3BId,
            scored: [],
            out: []
        }

        //Preserve starting runners to save with play data
        let startingRunnerResult = JSON.parse(JSON.stringify(runnerResult))

        let startingCount = JSON.parse(JSON.stringify( {
            balls: 0,
            strikes: 0,
            outs: command.outs
        }))

        let startingScore = JSON.parse(JSON.stringify(command.score))


        let defensiveCredits:DefensiveCredit[] = []

        //Throw pitches.
        let pitchLog: PitchLog = this.getPitchLog(command.rng, command.leagueAverages, pitcherChange, hitterChange, pitcher)

        //Check if any runners moved during the at-bat
        try {
            let pitchLogRunnerEvents:RunnerEvent[] = this.generateRunnerEventsFromPitchLog(command, runnerResult, defensiveCredits, pitcher, catcher, pitchLog)
            runnerEvents.push(...this.filterNonEvents(pitchLogRunnerEvents, undefined))
        } catch(ex) {
            //Ignore inning ending events errors.
            if (!(ex instanceof InningEndingEvent)) throw ex
        }

        if (pitchLog.count.strikes == 3) {
            playResult = PlayResult.STRIKEOUT
        } else if (pitchLog.count.balls == 4) {
            playResult = PlayResult.BB
        } else if (pitchLog.pitches.find(p => p.result == PitchResult.HBP)) {
            playResult = PlayResult.HIT_BY_PITCH
        } else if (pitchLog.pitches.find(p => p.result == PitchResult.IN_PLAY)) {

            //In play
            let pitch = pitchLog.pitches[pitchLog.pitches.length - 1]

            //How much better than average?
            let pitchQualityChange = this.getChange(command.leagueAverages.pitchQuality, pitch.quality)

            let contactRollChart:RollChart = this.getMatchupContactRollChart(command.leagueAverages, hitter.hittingRatings.contactProfile, pitcher.pitchRatings.contactProfile)

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

                fielder = this.getFielder(command.rng, command.leagueAverages, matchupHandedness.hits)

                //If we match on the ignore list get fielders until we don't.
                while (ignoreList.includes(fielder)) {
                    fielder = this.getFielder(command.rng, command.leagueAverages, matchupHandedness.hits)
                }

                fielderPlayer = command.defense.players.find(p => p.currentPosition == fielder)

            }

            let hitQuality:number

            //What kind of contact? 
            contact = contactRollChart.entries.get(this.getRoll(command.rng, 0, 99)) as Contact


            pickFielder(contact)

            //Calculate team defense. We're going to use this overall average to simulate being slightly better or worse at positioning.
            let teamDefenseChange:number = this.rollChartService.getChange(command.leagueAverages.hittingRatings.defense, this.getTeamDefense(command.defense))
            let fielderDefenseChange:number = this.rollChartService.getChange(command.leagueAverages.hittingRatings.defense, fielderPlayer.hittingRatings.defense)


            //Was it high quality contact? 1-1000
            hitQuality = this.getHitQuality(command.rng, pitchQualityChange, teamDefenseChange, fielderDefenseChange, contact, pitch.guess)

            let powerRollChart:RollChart = this.getMatchupPowerRollChart(command.leagueAverages, hitterChange, pitcherChange)

            //O, 1B, 2B, 3B, or HR
            playResult = powerRollChart.entries.get(hitQuality) as PlayResult


            //No pop up/line drive hits to IF. 
            while (this.isInAir(contact) && !this.isToOF(fielder) && playResult != PlayResult.OUT) {
                pickFielder(contact)
            }

            //No ground ball outs to the OF. Redirect to infielder.
            while (contact == Contact.GROUNDBALL && this.isToOF(fielder) && playResult == PlayResult.OUT) {
                pickFielder(contact)
            }

            //No doubles or triples to infielders
            while ( (playResult == PlayResult.DOUBLE || playResult == PlayResult.TRIPLE) && this.isToInfielder(fielder)) {
                pickFielder(contact)
            }


            if (this.isToOF(fielder)) {
                shallowDeep = this.getShallowDeep(command.rng, command.leagueAverages)
            }

            if (playResult == PlayResult.HR) {
                if (contact == Contact.GROUNDBALL) {
                    contact = hitQuality > 70 ? Contact.LINE_DRIVE : Contact.FLY_BALL
                }

                shallowDeep = ShallowDeep.DEEP
            } 

            if (playResult == PlayResult.TRIPLE) {
                shallowDeep = ShallowDeep.DEEP //Triples always deep for now.
            } 

        } else {
            throw new Error("Error with pitchlog")
        }

        //Players could have moved. Grab the correct base runners.
        let runner1B = command.offense.players.find( p => p._id == runnerResult.first)
        let runner2B = command.offense.players.find( p => p._id == runnerResult.second)
        let runner3B = command.offense.players.find( p => p._id == runnerResult.third)

        //Add in-play runner events
        this.getRunnerEvents(command.rng, runnerResult, command.halfInningRunnerEvents, runnerEvents, defensiveCredits, 
                             command.leagueAverages, playResult, contact, shallowDeep, hitter, fielderPlayer, runner1B, runner2B, runner3B, 
                             command.offense, command.defense, pitcher, pitchLog.count.pitches - 1)
        
        this.validateRunnerResult(runnerResult)

        let officialPlayResult = this.getOfficialPlayResult(playResult, contact, shallowDeep, fielder, runnerEvents)

        this.logResults(command, hitter, pitcher, defensiveCredits, runnerEvents, contact, officialPlayResult, playResult, pitchLog)

        return {
            index: command.playIndex,
            pitchLog: pitchLog,
            result: playResult,
            officialPlayResult: officialPlayResult,
            credits: defensiveCredits,
            runner: {
                events: runnerEvents,
                result: {
                    start: startingRunnerResult,
                    end: runnerResult,
                }
            },
            contact: contact,
            shallowDeep: shallowDeep,
            fielder: fielder,
            fielderId: fielderPlayer?._id,
            hitterId: command.hitterId,
            pitcherId: command.pitcherId,
            inningNum: command.inningNum,
            inningTop: command.inningTop,
            count: {
                start: startingCount
            },
            score: {
                start: startingScore
            }
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

    generateRunnerEventsFromPitchLog(command:SimMatchupCommand, runnerResult:RunnerResult, defensiveCredits:DefensiveCredit[], pitcher:GamePlayer, catcher:GamePlayer, pitchLog:PitchLog) {

        let runnerEvents:RunnerEvent[] = []

        let pitchIndex=0
        for (let pitch of pitchLog.pitches) {

            let runner1B = command.offense.players.find( p => p._id == runnerResult.first)
            let runner2B = command.offense.players.find( p => p._id == runnerResult.second)
            let runner3B = command.offense.players.find( p => p._id == runnerResult.third)


            let pitchEvents:RunnerEvent[] = this.initRunnerEvents(pitcher, 
                undefined,
                runner1B, 
                runner2B, 
                runner3B, 
                pitchIndex
            )

            //Move runners up on wild pitch.
            if (pitch.isWP) {

                //Advance runners one base
                this.advanceRunnersOneBase(runnerResult, pitchEvents, false)

                for (let re of pitchEvents) {
                    re.isWP = true
                }

                continue
            }

            //Move runners up on passed ball.
            if (pitch.isPB) {

                //Advance runners one base
                this.advanceRunnersOneBase(runnerResult, pitchEvents, false)

                for (let re of pitchEvents) {
                    re.isPB = true
                }

                //Credit the catcher
                defensiveCredits.push({
                    _id: catcher._id,
                    type: DefenseCreditType.PASSED_BALL
                })

                continue

            }

            //Stolen bases
            //Even if there's a good chance they can't go on every pitch
            //No stealing on the last pitch.
            if (pitchIndex < pitchLog.pitches.length - 1 ) {
                this.stealBases(runner1B, runner2B, runner3B, command.rng, runnerResult, command.halfInningRunnerEvents, pitchEvents, defensiveCredits, command.leagueAverages, catcher, command.defense, command.offense, pitcher, pitchIndex)            
            }

            let filteredEvents = this.filterNonEvents(pitchEvents, undefined)
            runnerEvents.push(...filteredEvents)

            this.validateInningOver( [].concat(command.halfInningRunnerEvents).concat(runnerEvents) )

            pitchIndex++
        }





        return runnerEvents
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

    round(number) {
        let result = Math.round(number * 100) / 100
        return result
    }

    validateLineup(teamInfo: TeamInfo) {

        //Make sure the lineup contains one player at every position and there's a starting pitcher
        let lineupPlayers = teamInfo.lineupIds.map(id => teamInfo.players.find(p => p._id == id))

        let positions = [Position.PITCHER, Position.CATCHER, Position.FIRST_BASE, Position.SECOND_BASE, Position.SHORTSTOP, Position.THIRD_BASE, Position.LEFT_FIELD, Position.RIGHT_FIELD, Position.CENTER_FIELD]

        for (let position of positions) {

            let players = lineupPlayers.filter(p => p.currentPosition == position)

            if (players.length != 1) {
                throw new Error(`Invalid lineup for team: ${players.length} players listed as ${position}`)
            }

            //Make sure they are in the lineup.
            if (!teamInfo.lineupIds.includes(players[0]._id)) {
                throw new Error(`Invalid lineup for team: ${players[0]._id} listed as ${position} but not in lineup.`)
            }

        }

        //Check pitcher
        if (!teamInfo.currentPitcherId) {

            throw new Error(`Invalid lineup for team: no pitcher`)

        } else {

            if (!teamInfo.lineupIds.includes(teamInfo.currentPitcherId)) {
                throw new Error(`Invalid lineup for team: current pitcher not in lineup.`)
            }

        }




    }

    logResults(command:SimMatchupCommand, hitter:GamePlayer, pitcher:GamePlayer, defensiveCredits:DefensiveCredit[], runnerEvents: RunnerEvent[], contact: Contact, officialPlayResult: OfficialPlayResult, playResult: PlayResult, pitchLog: PitchLog) {

        let outEvents = runnerEvents.filter( re => re.movement?.isOut)

        if (outEvents?.length > 0) {

            this.logOuts(pitcher.pitchResult, outEvents.length)

            //Log out for each runner
            for (let oe of outEvents) {
                this.logOuts(command.offense.players.find( p => p._id == oe.runner._id).hitResult, 1)
            }

        }


        //Log unearned runs
        let unearnedRuns = runnerEvents.filter( re => re.isScoringEvent)

        //If double play or an error, no RBIs.
        if (outEvents.length <= 1 && this.getTotalOuts(runnerEvents) < 2 && defensiveCredits.find(dc => dc.type == DefenseCreditType.ERROR) == undefined ) {
            this.logRBI(hitter.hitResult, unearnedRuns.length)
        }


        for (let re of unearnedRuns) {
            let runner = command.offense.players.find(p => p._id == re.runner._id)
            this.logRuns(runner.hitResult, pitcher.pitchResult)

            if (!re.isUnearned) {
                this.logEarnedRuns(pitcher.pitchResult)
            }

        }

        //Log left on base.
        if (this.getTotalOuts(runnerEvents) >= 3) {
            let startRunners = [command.runner1BId, command.runner2BId, command.runner3BId].filter(r => r != undefined).length
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
            let runner = command.offense.players.find(p => p._id == re.runner._id)
            this.logStolenBaseAttempt(runner.hitResult)
        }

        //Stolen bases
        let sb = runnerEvents.filter(re => re.isSB)

        for (let re of sb) {
            let runner = command.offense.players.find(p => p._id == re.runner._id)
            this.logStolenBase(runner.hitResult)
        }

        //Caught stealing
        let cs = runnerEvents.filter(re => re.isCS)

        for (let re of cs) {
            let runner = command.offense.players.find(p => p._id == re.runner._id)
            this.logCaughtStealing(runner.hitResult)
        }


        //Passed balls
        let passedBalls = defensiveCredits.filter( dc => dc.type == DefenseCreditType.PASSED_BALL)

        for (let dc of passedBalls) {
            let defender = command.defense.players.find(p => p._id == dc._id)
            this.logPassedBall(defender.hitResult)
        }

        //Putouts
        let putouts = defensiveCredits.filter( dc => dc.type == DefenseCreditType.PUTOUT)

        for (let dc of putouts) {
            let defender = command.defense.players.find(p => p._id == dc._id)
            this.logPutout(defender.hitResult)
        }

        //Assists
        let assists = defensiveCredits.filter( dc => dc.type == DefenseCreditType.ASSIST)

        for (let dc of assists) {
            let defender = command.defense.players.find(p => p._id == dc._id)
            this.logAssist(defender.hitResult)
        }


        //OF Assists
        let ofAssists = defensiveCredits.filter( dc => dc.type == DefenseCreditType.ASSIST && this.isToOF(command.defense.players.find(p => p._id == dc._id).currentPosition))

        for (let dc of ofAssists) {
            let defender = command.defense.players.find(p => p._id == dc._id)
            this.logOutfieldAssist(defender.hitResult)
        }

        //Errors
        let errors = defensiveCredits.filter( dc => dc.type == DefenseCreditType.ERROR)

        for (let dc of errors) {
            let defender = command.defense.players.find(p => p._id == dc._id)
            this.logErrors(defender.hitResult)
        }

        //Caught stealing defense
        let csDefense = defensiveCredits.filter( dc => dc.type == DefenseCreditType.CAUGHT_STEALING)

        for (let dc of csDefense) {
            let defender = command.defense.players.find(p => p._id == dc._id)
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
            
            default: 
                throw Error(`Error logging unknown play result ${playResult}`)


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

    getRunnerEvents(gameRNG, runnerResult:RunnerResult, halfInningRunnerEvents:RunnerEvent[], runnerEvents:RunnerEvent[], defensiveCredits:DefensiveCredit[], leagueAverages: LeagueAverage, playResult: PlayResult, 
                    contact: Contact, shallowDeep: ShallowDeep, hitter:GamePlayer, fielderPlayer: GamePlayer, 
                    runner1B:GamePlayer, runner2B:GamePlayer, runner3B:GamePlayer, offense:TeamInfo, defense:TeamInfo, pitcher:GamePlayer, pitchIndex:number) : RunnerResult {
        
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
    
                    //If it's a ground ball go for the force out. Advance any runners that must move.
                    if (contact == Contact.GROUNDBALL) {
                            
                        //Handle runner on third. 
                        if (runnerResult.third != undefined) {
    
                            runner3bRA.isForce = (runnerResult.second != undefined && runnerResult.first != undefined)
    
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
                        if (runnerResult.second != undefined) {
    
                            runner2bRA.isForce = (runnerResult.first != undefined)
    
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
                        if (runnerResult.first != undefined) {
    
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

        } catch(ex) {}

        runnerEvents.push(...this.filterNonEvents(events, hitter))

        return runnerResult


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
                    let jumpRoll = this.getRoll(gameRNG, 0, 999)

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
    
                            roll = throwRoll.roll + (throwRoll.roll * armChange) - (throwRoll.roll * receivingChange)
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
            return this.applyMinMaxToNumber(Math.round(defaultSuccess - (defaultSuccess * fielderChange) + (defaultSuccess * runnerChange)), 0, 99)
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
            return this.applyMinMaxToNumber(Math.round(defaultSuccess - (defaultSuccess * fielderChange) + (defaultSuccess * runnerSpeedChange) + (defaultSuccess * runnerStealsChange)), 0, 99)
        } else {
            return this.applyMinMaxToNumber(Math.round(defaultSuccess), 0, 99)
        }

    }

    getThrowResult(gameRNG, overallSafeChance:number) : ThrowRoll {

        let roll = this.getRoll(gameRNG, 1, 100)

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

        }

    }

    getRoll(generator, min, max) {
        return Math.floor(generator() * max) + min
    }

    getRollUnrounded(generator, min, max) {
        return (generator() * max) + min
    }

    private getFlyBallContactType(gameRNG: any): Contact {

        let rollChart = this.rollChartService.getContactTypeRollChart({
            flyBall: 70,
            lineDrive: 30,
            groundball: 0
        })

        return rollChart.entries.get(this.getRoll(gameRNG, 0, 99)) as Contact

    }

    private getFielder(gameRNG, leagueAverages: LeagueAverage, hitterHandedness:Handedness): Position {

        let rollChart = this.rollChartService.getFielderChanceRollChart(hitterHandedness == Handedness.R ? leagueAverages.fielderChanceR : leagueAverages.fielderChanceL)

        return rollChart.entries.get(this.getRoll(gameRNG, 0, 99)) as Position

    }

    private getOutfielder(gameRNG): Position {

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

        return rollChart.entries.get(this.getRoll(gameRNG, 0, 99)) as Position

    }

    private getShallowDeep(gameRNG: any, leagueAverages: LeagueAverage): ShallowDeep {

        let rollChart = this.rollChartService.getShallowDeepRollChart(leagueAverages.shallowDeepChance)

        return rollChart.entries.get(this.getRoll(gameRNG, 0, 99)) as ShallowDeep

    }

    public getPitchLog(gameRNG, leagueAverage: LeagueAverage, pitcherChange:PitcherChange, hitterChange:HitterChange, pitcher: GamePlayer): PitchLog {

        //Clone so we don't change outside of here.
        pitcherChange = JSON.parse(JSON.stringify(pitcherChange))

        let pitchLog: PitchLog = {

            count: {
                balls: 0,
                strikes: 0,
                fouls: 0,
                pitches: 0
            },

            pitches: []
        }

        //Sort pitcher's pitches by rating
        pitcher.pitchRatings.pitches.sort((a, b) => b.rating - a.rating)

        //Max of 5 pitches
        let pitches = pitcher.pitchRatings.pitches.map(p => p.type)
        let weights = [50, 25, 15, 5, 5] //later this can be passed in via strategy

        let keepGoing = true
        while (keepGoing) {

            //Choose a pitch type
            let pitchType: PitchType = this.weightedRandom(gameRNG, pitches, weights.slice(0, pitches.length))

            //Get pitcher's info about pitch.
            let pitchChange: PitchChange = JSON.parse(JSON.stringify(pitcherChange.pitchesChange.find(p => p.type == pitchType)))

            //Hitter will try to guess which pitch. 
            let hitterPitchGuess:PitchRating = pitcher.pitchRatings.pitches[this.getRoll(gameRNG, 0, pitches.length - 1)]
            let guessPitch:boolean = hitterPitchGuess.type == pitchType

            if (guessPitch) {

                //If hitter guesses pitch
                if (pitchChange.pitchChange >= 0) {
                    //If they have a good pitch change then zero it out.
                    pitchChange.pitchChange = 0
                } else {
                    //If they have a bad pitch change then multiply it.
                    pitchChange.pitchChange *= 1.5
                }
            }


            //How fast is it going? We can translate this to MPH later. 0-99.
            let powerQuality = this.getPowerQuality(gameRNG, pitcherChange.powerChange, pitchChange.pitchChange)
            
            //Did the pitcher throw it where they wanted? 0-99
            let locationQuality = this.getLocationQuality(gameRNG, pitcherChange.controlChange, pitchChange.pitchChange)

            //How much movement does the pitch have? 0-99
            let movementQuality = this.getMovementQuality(gameRNG, pitcherChange.movementChange, pitchChange.pitchChange)

            //Average for overall pitch quality
            let pitchQuality = this.getPitchQuality(powerQuality, locationQuality, movementQuality)
            
            //Is it in the strike zone?
            let inZone = this.isInZone(gameRNG, locationQuality, leagueAverage.inZoneRate)

            let pitch: Pitch = {
                type: pitchType,
                quality: pitchQuality,
                locQ: locationQuality,
                movQ: movementQuality,
                powQ: powerQuality,
                swing: false,
                con: false,
                result: inZone ? PitchResult.STRIKE : PitchResult.BALL,
                inZone: inZone,
                guess: guessPitch,
                isWP: false,
                isPB: false
            }


            if (locationQuality <= .025) {

                //Passed ball
                pitch.isPB = true
                pitch.inZone = false
                pitch.result = PitchResult.BALL

            } else if (locationQuality <= .25) {

                //HBP
                pitch.result = PitchResult.HBP
                pitch.inZone = false
                pitch.result = PitchResult.BALL

            } else if (locationQuality <= .50) {

                //Wild pitch
                pitch.isWP = true
                pitch.inZone = false
                pitch.result = PitchResult.BALL

            } else {

                //Does the batter swing?
                let swingResult = this.getSwingResult(gameRNG, hitterChange, leagueAverage, inZone, pitchQuality, guessPitch)


                //Create pitch. 
                pitch.swing = (swingResult != SwingResult.NO_SWING)
                pitch.con= (swingResult == SwingResult.FAIR || swingResult == SwingResult.FOUL)

                switch (swingResult) {

                    case SwingResult.FAIR:
                        pitch.result = PitchResult.IN_PLAY

                        break

                    case SwingResult.FOUL:

                        pitch.result = PitchResult.FOUL
                        pitchLog.count.fouls++

                        if (pitchLog.count.strikes < 2) {
                            pitchLog.count.strikes++
                        }

                        break

                    case SwingResult.STRIKE:

                        pitch.result = PitchResult.STRIKE
                        pitchLog.count.strikes++

                        break

                    case SwingResult.NO_SWING:

                        if (inZone) {
                            pitchLog.count.strikes++
                        } else {
                            pitchLog.count.balls++
                        }

                }


            }

            pitchLog.pitches.push(pitch)

            //HBP
            if (pitch.result == PitchResult.HBP) keepGoing = false
            
            //In play?
            if (pitch.result == PitchResult.IN_PLAY) keepGoing = false

            //Strikeout or walk?
            if (pitchLog.count.balls == 4) keepGoing = false
            if (pitchLog.count.strikes == 3) keepGoing = false

        }

        pitchLog.count.pitches = pitchLog.pitches.length

        // console.log(`Count: ${pitchLog.count.pitches}`)


        return pitchLog

    }

    isInZone(gameRNG, locationQuality:number, inZoneRate:number) {

        //90% of the chance should be a coin-flip (better location doesn't necessarily mean a strike)
        //and also with pitchers with poor location skills they'll walk like 80% of players making it unplayable.
        let chance = this.getRollUnrounded(gameRNG, 0, 90)

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

                swingRateAdjust.push(hitterChange.plateDisiplineChange)
                swingRateAdjust.push(pitchQualityChange * -1)

                if (guessPitch) {
                    swingRateAdjust.push(.3)
                }
            }

        } else {

            swingRate = leagueAverage.ballSwingRate

            //Better players swing less often on balls (unless 2 strikes)
            //Worse players swing more often on balls (because they are dumb).

            if (APPLY_PLAYER_CHANGES) {
                swingRateAdjust.push(hitterChange.plateDisiplineChange * -1 )  //negative adjust
                swingRateAdjust.push(pitchQualityChange) 

                if (guessPitch) {
                    swingRateAdjust.push(.3 * -1)
                }
            }
        }

        swingRate = this.rollChartService.applyChanges(swingRate, swingRateAdjust)


        //Roll die
        let die = this.getRollUnrounded(gameRNG, 0, 99)

        if (die >= 99 - swingRate) {

            //Swing
            let swingContactRate = inZone ? leagueAverage.zoneSwingContactRate : leagueAverage.chaseSwingContactRate //higher is better for pitcher

            //Increase or decrease chance based on hitter's contact rating and vsSameHand rating

            if (APPLY_PLAYER_CHANGES) {

                let swingContactRateAdjust = [
                    hitterChange.contactChange * -1, 
                    guessPitch ? -.2 : .2,
                    pitchQualityChange  
                ]

                swingContactRate = this.rollChartService.applyChanges(swingContactRate, swingContactRateAdjust)

            }


            let die2 = this.getRoll(gameRNG, 0, 99)

            if (die2 > swingContactRate) {

                //Swinging strike
                return SwingResult.STRIKE

            } else {

                //Made contact

                //Roll for fair/foul
                let die3 = this.getRoll(gameRNG, 0, 99)

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

    getPowerQuality(gameRNG, powerChange: number, pitchChange:number): number {

        let roll =  this.getRollUnrounded(gameRNG, 0, 99)

        if (APPLY_PLAYER_CHANGES) {
            roll += (roll * powerChange)// + (roll * (pitchChange * .5))
        }


        if (roll < 0) roll = 0
        if (roll > 99) roll = 99

        return parseFloat(roll.toFixed(2))

    }

    getLocationQuality(gameRNG, controlChange: number, pitchChange:number): number {

        let roll = this.getRollUnrounded(gameRNG, 0, 99)

        if (APPLY_PLAYER_CHANGES) {
            roll += (roll * controlChange) //+ (roll * (pitchChange * .5))
        }

        if (roll < 0) roll = 0
        if (roll > 99) roll = 99

        return parseFloat(roll.toFixed(2))

    }

    getMovementQuality(gameRNG, movementChange: number, pitchChange:number): number {
        
        let roll =  this.getRollUnrounded(gameRNG, 0, 99)


        if (APPLY_PLAYER_CHANGES) {
            roll += (roll * movementChange)// + (roll * (pitchChange * .5))
        }


        if (roll < 0) roll = 0
        if (roll > 99) roll = 99

        return parseFloat(roll.toFixed(2))

    }

    getPitchQuality(powerQuality: number, locationQuality: number, movementQuality: number) {
        return Math.round(this._getAverage([powerQuality, locationQuality, movementQuality]))
    }

    getHitQuality(gameRNG, pitchQualityChange:number, teamDefenseChange:number, fielderDefenseChange:number, contact:Contact, guessPitch:boolean) : number {

        const FULL_DEFENSE_BONUS = -200
        const FULL_PITCH_QUALITY_BONUS = -200

        let roll 
        let bonusRoll = 0


        //Pitch quality
        bonusRoll += FULL_PITCH_QUALITY_BONUS * pitchQualityChange

        //Defense
        bonusRoll += (FULL_DEFENSE_BONUS / 2) * teamDefenseChange
        bonusRoll += FULL_DEFENSE_BONUS * fielderDefenseChange

        //Contact
        switch(contact) {
            case Contact.FLY_BALL:
                bonusRoll += 50
                break
            case Contact.LINE_DRIVE:
                bonusRoll += 100
                break
        }

        if (guessPitch) bonusRoll += 30

        do {
            roll =  this.getRoll(gameRNG, 0, 999) + bonusRoll 
        } while(roll < 0 || roll > 999)

        return Math.round(roll)    
    
    }

    //Source 
    // https://github.com/trekhleb/javascript-algorithms/blob/master/src/algorithms/statistics/weighted-random/weightedRandom.js
    weightedRandom(gameRNG, items, weights) {

        if (items.length !== weights.length) {
            throw new Error('Items and weights must be of the same size')
        }

        if (!items.length) {
            throw new Error('Items must not be empty')
        }

        // Preparing the cumulative weights array.
        // For example:
        // - weights = [1, 4, 3]
        // - cumulativeWeights = [1, 5, 8]
        const cumulativeWeights = [];
        for (let i = 0; i < weights.length; i += 1) {
            cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0)
        }

        // Getting the random number in a range of [0...sum(weights)]
        // For example:
        // - weights = [1, 4, 3]
        // - maxCumulativeWeight = 8
        // - range for the random number is [0...8]
        const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1]
        const randomNumber = maxCumulativeWeight * gameRNG()

        // Picking the random item based on its weight.
        // The items with higher weight will be picked more often.
        for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
            if (cumulativeWeights[itemIndex] >= randomNumber) {
                return items[itemIndex]
            }
        }
    }

    getGamePlayer(game: Game, playerId: string): GamePlayer {
        return [].concat(game.away.players).concat(game.home.players).find(p => p.player._id == playerId)
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

    async generateHittingProfile(): Promise<HittingProfile> {

        let rng = await this.seedService.getRNG()

        //Generate 9 distributed ratings
        let nums = this.getRatingDistribution(rng, 9)

        let lowestIndex = 0;
        let lowestAbs = Math.abs(nums[0])

        // 1. Find the index of the number with the lowest absolute value
        for (let i = 1; i < nums.length; i++) {

            const currentAbs = Math.abs(nums[i])
            
            if (currentAbs < lowestAbs) {
                lowestAbs = currentAbs
                lowestIndex = i
            }

        }

        // 2. Remove the element from its current position
        const [element] = nums.splice(lowestIndex, 1)

        // 3. Add the element to the end of the array
        nums.push(element)



        //Generate contact profile
        let contactProfile = this.generateContactProfile(rng)


        let profile:HittingProfile = {
            plateDisciplineDelta: nums[0],
            contactDelta: nums[1],
        
            gapPowerDelta: nums[2],
            homerunPowerDelta: nums[3],
        
            speedDelta: nums[4],
            stealsDelta: nums[5],
        
            defenseDelta: nums[6],
            armDelta: nums[7],
        
            vsSameHandDelta: -Math.abs(nums[8]), //Make sure it's negative

            contactProfile: contactProfile
            
        }

        return profile

    }

    async generatePitchingProfile(isPitcher: boolean = true): Promise<PitchingProfile> {

        let rng = await this.seedService.getRNG()

        let pitches:PitchProfile[]
        let nums
        let vsSameHandDelta

        do {

            pitches = []

            //Roll for # of pitches 3-5
            let numPitches

            if (isPitcher) {
                numPitches = this.weightedRandom(rng, [2, 3, 4, 5], [20, 20, 40, 20])
            } else {
                numPitches = 1
            }

            //Generate distributed ratings
            nums = this.getRatingDistribution(rng, 4 + numPitches)


            let lowestIndex = 0;
            let lowestAbs = Math.abs(nums[0])

            // 1. Find the index of the number with the lowest absolute value
            for (let i = 1; i < nums.length; i++) {

                const currentAbs = Math.abs(nums[i])
                
                if (currentAbs < lowestAbs) {
                    lowestAbs = currentAbs
                    lowestIndex = i
                }

            }

            // 2. Remove the element from its current position
            [vsSameHandDelta] = nums.splice(lowestIndex, 1)

            vsSameHandDelta = -Math.abs(vsSameHandDelta) //make sure it's negative

            for (let i = 0; i < numPitches; i++) {
                pitches.push(this.generatePitchRating(rng, i + 1, nums[3 + i], pitches.map(p => p.type)))
            }
    
            pitches.sort((a, b) => b.ratingDelta - a.ratingDelta)
    
            //Remove any pitches that are 15% worse than league average. Pitchers wouldn't throw them. Except fastball.
            //This probably messes with the actual league average. There's probably a better way to do this.
            //Hitters can have a trash fastball though
            if (pitches.length > 1) {
                pitches = pitches.filter( p => p.ratingDelta > -.15 || p.type == PitchType.FF)
            }

        } while (pitches.length == 0) //if we don't have any pitches re-roll

        let contactProfile = this.generateContactProfile(rng)

        let profile:PitchingProfile = {
            controlDelta: nums[0],
            movementDelta: nums[1],
            powerDelta: nums[2],
            vsSameHandDelta: vsSameHandDelta,
            contactProfile: contactProfile,
            pitches: pitches
        }

        return profile

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

    generatePitchRating(playerRNG, pitchNum: number, rating: number, exclude: PitchType[]): PitchProfile {

        let available: PitchType[] = [PitchType.SI, PitchType.SL, PitchType.SV, PitchType.CU, PitchType.CH, PitchType.SC, PitchType.FS, PitchType.FO]

        for (let e of exclude) {
            available.splice(available.indexOf(e), 1)
        }

        let type

        if (pitchNum == 1) {
            type = PitchType.FF
        } else {
            type = this.weightedRandom(playerRNG, available, available.map(p => 1))
        }


        let pitchProfile: PitchProfile = {
            type: type,
            ratingDelta: rating
        }

        return pitchProfile

    }

    getRatingDistribution(playerRNG, numRatings): number[] {

        let nums: number[] = []

        //Generate until we get an array that adds up to 100
        while (nums.length == 0) {

            //Generate numRatings number of ratings
            for (let i = 0; i < numRatings; i++) {
                nums.push(this.getRoll(playerRNG, 20, 100))
            }

            //Get the total
            let total = nums.reduce((acc, num) => acc + num, 0)

            //Divide each one by the total and round.
            for (let i = 0; i < nums.length; i++) {
                nums[i] = Math.round((nums[i] / total) * 100)
            }

            let newTotal = nums.reduce((acc, num) => acc + num, 0)

            //If we don't equal 100 start over.
            if (newTotal != 100) {
                nums.length = 0//try again
                continue
            }

            //Now turn them into the % better than average. Average being equally distributed.
            let overallAverage = 100 / numRatings
            for (let i = 0; i < nums.length; i++) {

                nums[i] = this.getChange(overallAverage, nums[i])

                //Make sure we're between -1 and 1
                if (nums[i] > 1 || nums[i] < -1) {
                    nums.length = 0 //try again
                } 
            }

        }
        return nums

    }

    generateContactProfile(playerRNG): ContactProfile {

        let nums: number[] = []

        //Generate until we get an array that adds up to 1000
        while (nums.length == 0) {

            //Generate numRatings number of ratings
            for (let i = 0; i < 3; i++) {
                nums.push(this.getRoll(playerRNG, 0, 1000))
            }

            //Get the total
            let total = nums.reduce((acc, num) => acc + num, 0)

            //Divide each one by the total and round.
            for (let i = 0; i < nums.length; i++) {
                nums[i] = Math.round((nums[i] / total) * 1000)
            }

            let newTotal = nums.reduce((acc, num) => acc + num, 0)

            //If we don't equal 1000 start over.
            if (newTotal != 1000) {
                nums.length = 0//try again
                continue
            }

            //GB percent between 250 and 650
            if (nums[0] > 650 || nums[0] < 250) {
                nums.length = 0 //try again
            }

            //FB percent between 150 and 550
            if (nums[1] > 550 || nums[1] < 150) {
                nums.length = 0 //try again
            } 

            //LD percent between 150 and 350
            if (nums[2] > 350 || nums[2] < 150) {
                nums.length = 0 //try again
            }

        }

        return {
            groundball: nums[0],
            flyBall: nums[1],
            lineDrive: nums[2]
        }
        
    }

    getArrayAvg(array) {
        return array.reduce((a, b) => a + b) / array.length
    }



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


export { RollService }
import { League } from "../dto/league.js"
import { ContactTypeRollInput, PowerRollInput } from "../dto/roll-input.js"
import { OverallRecord } from "../dto/team.js"

const DIAMONDS_PER_DAY = 1000 

enum Position {
    CATCHER = "C",
    PITCHER = "P",
    FIRST_BASE = "1B",
    SECOND_BASE = "2B",
    THIRD_BASE = "3B",
    SHORTSTOP = "SS",
    LEFT_FIELD = "LF",
    CENTER_FIELD = "CF",
    RIGHT_FIELD = "RF"
}

enum PitchType {
    FF = "FF",
    CU = "CU",
    CH = "CH",
    FC = "FC",
    FO = "FO",
    KN = "KN",
    KC = "KC",
    SC = "SC",
    SI = "SI",
    SL = "SL",
    SV = "SV",
    FS = "FS",
    ST = "ST"
}

enum Handedness {
    L = "L",
    R = "R",
    S = "S"
}



enum OfficialPlayResult {

    //Don't count as AB
    INTENT_WALK = "Intent Walk",
    HIT_BY_PITCH = "Hit By Pitch",
    SAC_FLY = "Sac Fly",
    SAC_FLY_DP = "Sac Fly DP",
    WALK = "Walk",
    CATCHER_INTERFERENCE = "Catcher Interference",
    RUNNER_OUT = "Runner Out",
    EJECTION = "Ejection",

    //Hits
    SINGLE = "Single",
    DOUBLE = "Double",
    TRIPLE = "Triple",
    HOME_RUN = "Home Run",

    //Strikeouts
    STRIKEOUT = "Strikeout",
    STRIKEOUT_DP = "Strikeout - DP",

    //Sacrifice
    SAC_BUNT = 'Sac Bunt',
    SAC_BUNT_DP = 'Sacrifice Bunt DP',

    //Outs
    BATTER_INTERFERENCE = 'Batter Interference',

    BUNT_GROUNDOUT = 'Bunt Groundout',
    BUNT_LINEOUT = 'Bunt Lineout',
    BUNT_POPOUT = 'Bunt Pop Out',

    FAN_INTERFERENCE = 'Fan Interference',

    FIELDERS_CHOICE = 'Fielders Choice',

    FLYOUT = 'Flyout',
    POP_OUT = 'Pop Out',
    FOURCEOUT = 'Forceout',
    GROUNDOUT = 'Groundout',

    GROUNDED_INTO_DP = 'Grounded Into DP',
    TRIPLE_PLAY = 'Triple Play'

}

enum OfficialRunnerResult {

    TAGGED_OUT = "Tagged out",
    FORCE_OUT = "Force out",

    HOME_TO_FIRST = "Advanced from home to 1B",
    HOME_TO_SECOND = "Advanced from home to 2B",
    HOME_TO_THIRD = "Advanced from home to 3B",
    HOME_TO_SCORE = "Advanced from home to come around and score",


    FIRST_TO_SECOND = "Advanced from 1B to 2B",
    FIRST_TO_THIRD = "Advanced from 1B to 3B",
    FIRST_TO_HOME = "Advanced from 1B to home",

    SECOND_TO_THIRD = "Advanced from 2B to 3B",
    SECOND_TO_HOME = "Advanced from 2B to home",
    THIRD_TO_HOME = "Advanced from 3B to home",

    TAGGED_FIRST_TO_SECOND = "Tagged up and moved from 1B to 2B",
    TAGGED_SECOND_TO_THIRD = "Tagged up and moved from 2B to 3B",
    TAGGED_THIRD_TO_HOME = "Tagged up and scored from 3B.",


    STOLEN_BASE_2B = "Stolen Base 2B",
    STOLEN_BASE_3B = "Stolen Base 3B",
    STOLEN_BASE_HOME = "Stolen Base Home",

    CAUGHT_STEALING_2B = "Caught Stealing 2B",
    CAUGHT_STEALING_3B = "Caught Stealing 3B",
    CAUGHT_STEALING_HOME = "Caught Stealing Home",

}

enum HomeAway {
    HOME = "Home",
    AWAY = "Away"
}

enum HitterPitcher {
    HITTER = "H",
    PITCHER = "P"
}



interface Rating {
    rating:number
    ratingDeviation:number
    volatility:number
}



interface GamePlayer {
    _id:string
    playerId:string
    coverImageCid:string
    fullName: string
    firstName:string
    lastName:string
    displayName: string

    age:number

    teamId?:string

    overallRating: {
        before:number,
        after?:number,
        change?:number
    }

    ownerId:string 
    color1:string
    color2:string

    throws:Handedness
    hits:Handedness

    pitchRatings:PitchRatings
    hittingRatings:HittingRatings

    currentPosition?:Position
    lineupIndex?:number

    hitResult:HitResultCount
    pitchResult:PitchResultCount

    // seasonStats?: {
    //     before?:PlayerStatLines
    //     after?:PlayerStatLines
    // }

    // careerStats?: {
    //     before?:PlayerStatLines
    //     after?:PlayerStatLines
    // }

    hitterChange: {
        vsL: HitterChange
        vsR: HitterChange
    }

    pitcherChange: {
        vsL: PitcherChange
        vsR: PitcherChange
    }

    isPitcherOfRecord?:boolean
}

interface PlayerStatLines {
    hitting: HitterStatLine
    pitching: PitcherStatLine
}

// interface ContractYear {
//     startDate?:string
//     endDate?:string
//     complete:boolean
//     isArbitration:boolean
//     isPreArbitration:boolean
//     isPlayerOption:boolean
//     isTeamOption:boolean
//     salary?:string
// }

// interface PlayerContract {
//     startDate?:string
//     endDate?:string
//     isRookie:boolean
//     years:ContractYear[]
// }


interface HitterStatLine {

    teamWins:number
    teamLosses:number

    games: number
    pa: number
    atBats: number
    runs: number
    hits: number
    singles: number
    doubles: number
    triples: number
    homeRuns: number
    hbp:number 

    gidp:number
    po:number
    assists:number
    outfieldAssists:number

    e:number
    passedBalls:number

    csDefense:number
    doublePlays:number

    hbpPercent?:number
    singlePercent?:number
    doublePercent?:number
    triplePercent?:number
    homeRunPercent?:number
    bbPercent?:number
    soPercent?:number

    strikePercent?:number
    ballPercent?:number
    swingPercent?:number
    foulPercent?:number
    swingAtBallsPercent?:number
    swingAtStrikesPercent?:number
    inZonePercent?:number
    inZoneContactPercent?:number
    outZoneContactPercent?:number
    inPlayPercent?:number
    babip?:number

    groundBallPercent?:number
    flyBallPercent?:number
    ldPercent?:number
    popupPercent?:number

    rbi: number
    sb: number
    sbAttempts:number
    cs: number
    bb: number
    so: number
    avg?: number
    obp?: number
    slg?: number
    ops?: number
    wpa?:number

    avgPitchQuality: number
    avgPitchPowerQuality: number
    avgPitchLocationQuality: number
    avgPitchMovementQuality: number

    runsPerGame?:number  
    sbPerGame?:number  
    sbAttemptsPerGame?:number
    pitchesPerPA?:number
}

interface PitcherStatLine {
    games: number
    wins: number
    losses: number
    winPercent?:number
    era?: number
    starts: number
    outs: number
    cg: number
    sho: number
    saves: number
    ip?: string
    atBats: number
    battersFaced: number
    hits: number
    runs: number
    er: number
    homeRuns: number
    bb: number
    so: number
    hbp: number
    wpa:number 
    wildPitches:number

    singlePercent?:number
    doublePercent?:number
    triplePercent?:number
    homeRunPercent?:number

    hbpPercent?:number
    bbPercent?:number
    soPercent?:number
    strikePercent?:number
    ballPercent?:number
    swingPercent?:number
    inPlayPercent?:number
    foulPercent?:number
    wildPitchPercent?:number
    swingAtBallsPercent?:number
    swingAtStrikesPercent?:number
    inZonePercent?:number
    inZoneContactPercent?:number
    outZoneContactPercent?:number
    babip?:number

    groundBallPercent?:number
    flyBallPercent?:number
    ldPercent?:number
    popupPercent?:number

    avgPitchQuality: number
    avgPitchPowerQuality: number
    avgPitchLocationQuality: number
    avgPitchMovementQuality: number

    runsPerGame?:number
    pitchesPerGame?:number
    pitchesPerPA?:number

}

interface ContactProfile {
    groundball:number
    flyBall:number
    lineDrive:number
}


interface PitchRatings {
    power?:number

    contactProfile?:ContactProfile

    vsR?:PitchingHandednessRatings
    vsL?:PitchingHandednessRatings

    pitches?:PitchRating[]
}

interface PitchRating {
    type:PitchType
    rating:number //1-100
}

interface PitchingHandednessRatings {

    control?:number
    movement?:number 

}



interface HittingRatings {

    defense?:number
    arm?:number

    speed?:number
    steals?:number

    contactProfile?:ContactProfile

    vsR?:HittingHandednessRatings
    vsL?:HittingHandednessRatings

}


interface HittingHandednessRatings {

    plateDiscipline?:number
    contact?:number 

    gapPower?:number
    homerunPower?:number

}


interface PlayerPercentileRatings {

  _id: string

  overallRating_pct: number | null

  hittingRatings:HittingRatings

  pitchRatings: PitchRatings
}




interface HitResultCount {

    games:number

    teamWins:number
    teamLosses:number
    
    pa:number
    atBats:number 
    hits:number 

    singles:number 
    doubles:number 
    triples:number 
    homeRuns:number

    runs:number 
    rbi:number 
    bb:number 
    sb:number
    sbAttempts:number
    cs:number
    hbp:number 
    so:number 
    lob:number 
    sacBunts:number 
    sacFlys:number

    groundOuts:number 
    flyOuts:number
    lineOuts:number
    outs:number
    
    groundBalls:number
    lineDrives:number
    flyBalls:number

    gidp:number
    po:number
    assists:number
    outfieldAssists:number
    e:number
    passedBalls:number

    csDefense:number
    doublePlays:number

    pitches:number
    balls:number
    strikes:number
    fouls:number

    swings:number
    swingAtBalls:number
    swingAtStrikes:number
    inZoneContact:number
    outZoneContact:number

    inZone:number

    ballsInPlay:number

    totalPitchQuality: number
    totalPitchPowerQuality: number
    totalPitchLocationQuality: number
    totalPitchMovementQuality: number

    wpa:number

}

interface PitchResultCount {

    games:number

    teamWins:number
    teamLosses:number

    starts:number
    wins:number
    losses:number
    saves:number
    bs:number

    outs:number
    er:number
    so:number
    hits:number
    bb:number
    sho:number
    cg:number
    hbp:number

    singles:number
    doubles:number
    triples:number

    battersFaced:number
    atBats:number

    runs:number
    homeRuns:number

    groundOuts:number
    flyOuts:number

    lineOuts:number
    groundBalls:number
    lineDrives:number
    flyBalls:number

    pitches:number
    balls:number
    strikes:number
    fouls:number
    wildPitches:number

    swings:number
    swingAtBalls:number
    swingAtStrikes:number
    inZoneContact:number
    outZoneContact:number

    ballsInPlay:number

    inZone:number
    ip:string

    sacFlys:number

    totalPitchQuality: number
    totalPitchPowerQuality: number
    totalPitchLocationQuality: number
    totalPitchMovementQuality: number

    wpa:number

}



interface HalfInning {
    num: number
    top: boolean
    linescore: LinescoreTeam
    plays: Play[]
}

interface TeamInfo {

    _id?:string
    logoId:string

    finances:GameTeamFinance

    cityName?:string
    name:string
    abbrev:string
    homeAway:HomeAway
    
    seasonRating?: {
        before?:number
    }

    longTermRating?: {
        before?:number
    }

    overallRecord?: {
        before?:OverallRecord
        after?:OverallRecord
    }

    color1?:string
    color2?:string

    players?:GamePlayer[]

    lineupIds?:string[]

    currentHitterIndex?:number
    currentPitcherId?:string

    //Runners
    runner1BId?:string
    runner2BId?:string
    runner3BId?:string

}




interface GamePlayerBio {

    _id:string
    playerId:string
    fullName: string
    // ratingBefore:Rating

    age:number
    ownerId:string 

    throws:Handedness
    hits:Handedness

    hitResult:HitterStatLine
    pitchResult:PitcherStatLine

}

interface GameTeamFinance {
    // totalAttendance?: number
    totalRevenue?: string

    // payroll?:string
    // stadiumLease?:string
}


interface LinescoreTeam {
    runs: number
    hits: number
    errors: number
    leftOnBase: number
}

interface Count {
    balls: number
    strikes: number
    outs: number
}

interface Score {
    away:number
    home:number
}

interface BaseRunners {
    first: GamePlayerBio
    second: GamePlayerBio
    third: GamePlayerBio
}

interface BaseRunnerIds {
    first: number
    second: number
    third: number
}

interface UpcomingMatchup {
    hitter: GamePlayerBio
    pitcher: GamePlayerBio
}


interface LastPlay {
    hitter:GamePlayerBio
    pitcher:GamePlayerBio
    play: Play
    inning: number
    top: boolean
    first:GamePlayerBio
    second:GamePlayerBio
    third:GamePlayerBio
}


interface MatchupHandedness {
    throws: Handedness,
    hits: Handedness,
    vsSameHand: boolean
}

interface Play {
    index: number
    pitchLog: PitchLog
    result: PlayResult
    officialPlayResult: OfficialPlayResult|OfficialRunnerResult

    runner: {
        events: RunnerEvent[]
        result: {
            start: RunnerResult
            end: RunnerResult
        }
    }

    credits?:DefensiveCredit[]
    contact: Contact
    shallowDeep: ShallowDeep
    fielder: Position
    fielderId:string
    hitterId: string
    pitcherId: string
    count?: {
        start: Count
        end?: Count
    }
    score?: {
        start: Score
        end?: Score
    }
    inningNum: number
    inningTop: boolean
}

class InningEndingEvent extends Error {}

interface WPA {

    expectancyBefore?:number
    expectancyAfter?:number

    total?:number

    rewards?:WPAReward[]

}

interface WPAReward {
    playerId:string
    reward:number
    hitting:boolean
}

interface SimMatchupCommand {

    offense: TeamInfo
    defense: TeamInfo

    outs: number

    //Runners
    runner1BId?: string
    runner2BId?: string
    runner3BId?: string

    hitterId: string
    pitcherId: string

    leagueAverages: LeagueAverage

    rng: any

    playIndex: number,

    inningNum: number,
    inningTop: boolean,

    score?:Score
    halfInningRunnerEvents:RunnerEvent[]

}

enum PlayResult {

    STRIKEOUT = "STRIKEOUT",
    OUT = "OUT",
    HIT_BY_PITCH = "HIT_BY_PITCH",
    BB = "BB",
    SINGLE = "SINGLE",
    DOUBLE = "DOUBLE",
    TRIPLE = "TRIPLE",
    HR = "HR"

}

enum Contact {
    GROUNDBALL = "GROUNDBALL",
    LINE_DRIVE = "LINE_DRIVE",
    FLY_BALL = "FLY_BALL"
}


enum ShallowDeep {
    SHALLOW = "SHALLOW",
    NORMAL = "NORMAL",
    DEEP = "DEEP"
}

interface PitchLog {
    pitches: Pitch[]
    count: PitchCount
}

interface Pitch {
    result: PitchResult,
    type: PitchType,
    quality: number
    powQ: number
    locQ: number
    movQ: number
    swing: boolean
    inZone:boolean
    isWP:boolean
    isPB:boolean
    con:boolean
    guess:boolean
}

enum PitchResult {
    BALL = "BALL",
    STRIKE = "STRIKE",
    FOUL = "FOUL",
    IN_PLAY = "IN_PLAY",
    HBP = "HIT_BY_PITCH",
}

interface PitchCount {
    balls: number
    strikes: number
    fouls: number
    pitches: number
}



interface ShallowDeepChance {
    shallow: number
    normal: number
    deep: number
}

interface FielderChance {
    first: number
    second: number
    third: number
    catcher: number
    shortstop: number
    leftField: number
    centerField: number
    rightField: number
    pitcher: number
}

// interface ContactType {
//     groundball: number
//     lineDrive: number
//     flyBall: number
// }


enum BaseResult {

    FIRST = "1B",
    SECOND = "2B",
    THIRD = "3B",
    HOME = "home",
}


enum DefenseCreditType {
    ASSIST = "ASSIST",
    ERROR = "ERROR",
    PUTOUT = "PUTOUT",
    CAUGHT_STEALING = "CAUGHT_STEALING",
    PASSED_BALL = "PASSED_BALL"
}

interface DefensiveCredit { 
    _id:string
    type:DefenseCreditType
}

interface ThrowRoll {
    roll:number
    result:ThrowResult
}

interface RunnerEvent {

    pitchIndex:number

    pitcher: {
        _id: string
    }

    runner?: {
        _id: string
    }

    eventType?: PlayResult|OfficialRunnerResult

    movement?: {
        start?: BaseResult
        end?: BaseResult
        outBase?: BaseResult
        isOut?:boolean
        outNumber?:number
    }


    isUnearned?:boolean
    isScoringEvent?:boolean
    isForce?:boolean
    isFC?:boolean
    isWP?:boolean
    isPB?:boolean
    isError?:boolean

    isSBAttempt?:boolean
    isSB?:boolean
    isCS?:boolean

    throw?: {

        result: ThrowResult

        from?: {
            _id?: string,
            position?:Position
        },

        to?: {
            _id?:string,
            position:Position
        }
    }
}

enum ThrowResult {
    SAFE = "safe",
    OUT = "out",
    NO_THROW = "no throw"
}

// interface ThrowResult {
//     from: Position
//     to: Position
// }

interface RunnerResult {
    first: string
    second: string
    third: string
    scored: string[]
    out: string[]
}


enum SwingResult {
    FAIR = "FAIR",
    FOUL = "FOUL",
    STRIKE = "STRIKE",
    NO_SWING = "NO_SWING"
}



interface PitchingProfile {

    powerDelta:number
    controlDelta:number
    movementDelta:number 

    vsSameHandDelta:number 

    contactProfile:ContactProfile

    pitches:PitchProfile[]


}

interface PitchProfile {
    type:PitchType
    ratingDelta:number
}



interface HittingProfile {

    plateDisciplineDelta:number
    contactDelta:number 

    gapPowerDelta:number
    homerunPowerDelta:number

    speedDelta:number
    stealsDelta:number

    defenseDelta:number
    armDelta:number

    vsSameHandDelta:number   

    contactProfile:ContactProfile

}


interface LeagueAverage {

    hittingRatings:HittingRatings
    pitchRatings:PitchRatings

    powerRollInput:PowerRollInput,
    contactTypeRollInput:ContactTypeRollInput

    foulRate:number,

    inZoneRate:number
    ballSwingRate:number
    strikeSwingRate:number

    zoneSwingContactRate:number
    chaseSwingContactRate:number

    pitchQuality:number,

    fielderChanceR:FielderChance
    fielderChanceL:FielderChance
    shallowDeepChance:ShallowDeepChance

}

interface InZoneByCount {
    balls:number
    strikes:number
    inZone:number
}

interface BallTakeByCount {
    balls:number
    strikes:number
    take:number
}

interface BallSwingByCount {
    balls:number
    strikes:number
    swing:number
}

interface StrikeTakeByCount {
    balls:number
    strikes:number
    take:number
}

interface StrikeSwingByCount {
    balls:number
    strikes:number
    swing:number
}

interface LeagueAverageRatings {
    league?:League
    hittingRatings:HittingRatings
    pitchRatings:PitchRatings
}

type ScheduledGame = { 
    awayId:string
    homeId:string
}

interface ScheduleDetails {
    startDate:string
    endDate:string
    schedule:Schedule
}

type Schedule = {
    [date: string]: ScheduledGame[]
}

type SeriesSchedule = {
    [series: string]: ScheduledGame[]
}

type Matchup = {
    home: string
    away: string
}



interface PlayerFinalContract {
    _id:string
    contractComplete: true,
    startDate: string
    endDate: string
}

// interface IncrementPlayer {
//     _id:string
//     overallRating:number
//     hittingRatings:HittingRatings
//     pitchRatings:PitchRatings
//     careerStats:PlayerStatLines
//     lastGameUpdate:Date
// }

interface PlayerReport {

    maxRating:number
    minRating:number
    avgRating:number

    highSchool:number
    juco:number
    college:number
    minors:number
    majors:number
    count:number
    
}



interface PitcherChange {

    powerChange: number
    controlChange: number
    movementChange: number

    pitchesChange:PitchChange[]

}

interface PitchChange {
    type:PitchType
    pitchChange:number
}

interface HitterChange {

    plateDisiplineChange: number
    contactChange: number

    gapPowerChange: number
    hrPowerChange: number

    speedChange: number
    stealsChange:number

    defenseChange:number
    armChange:number

}

interface PromotionRelegationLog {
    _id:string
    rank:number
    previousRank:number
}

interface LeagueBundle {
    league:League
    laPlayerRating:number
    laSalary:number
}

interface HitResultGame {
    gameId:string
    playerId:string
    startDate:string
    hitResult:HitResultCount
    seasonStats:PlayerStatLines
}

interface PitchResultGame {
    gameId:string
    playerId:string
    startDate:string
    pitchResult:PitchResultCount
    seasonStats:PlayerStatLines
}

enum PlayerTransactionType {
    SIGN_CONTRACT = "SIGN_CONTRACT",
    DROP = "DROP",
    TRADE = "TRADE"
}

enum ContractType {
    DIAMONDS = "DIAMONDS"

}

interface TeamSeasonId { 
    teamId:string, 
    seasonId:string 
}

interface TokenSeasonId { 
    tokenId:number, 
    seasonId:string 
}

enum PersonalityType {
  ISFJ = "The Protector",
  ESFJ = "The Caregiver",
  ISTJ = "The Inspector",
  ISFP = "The Artist",
  ESTJ = "The Director",
  ESFP = "The Performer",
  ENFP = "The Champion",
  ISTP = "The Crafter",
  INFP = "The Mediator",
  ESTP = "The Persuader",
  INTP = "The Thinker",
  ENTP = "The Debater",
  ENFJ = "The Giver",
  INTJ = "The Architect",
  ENTJ = "The Commander",
  INFJ = "The Advocate"
}

const ROSTER_LOCK_HOUR = 13
const MINIMUM_PLAYER_POOL = 1400
const TEAMS_PER_TIER = 28
const SERIES_LENGTH = 3

const MAX_AAV_CONTRACT = 40000000
const AVG_AAV_CONTRACT = 10000000

const MIN_AAV_CONTRACT = 500000

const LEASE_PER_CAPACITY = 100


enum OwnerSorts {
    TEAM_COUNT = "team",
    DIAMONDS = "diamonds",
    REWARDS = "rewards"
}

interface TeamCost {
    revenueWithMultiplier: string,
    totalDiamonds: string,
    ethCost: string,
    ethCostDecimal: string
}


const PLAYER_STATS_SORT_EXPRESSION: Record<string, string> = {
  // scalar / joined columns
  'displayRating': 'pls.displayRating',
  'age': 'pls.age',
  'throws': 'p.throws',
  'hits': 'p.hits',

  // hitting
  'hitting.games':           'CAST(stats->>"$.hitting.games" AS SIGNED)',
  'hitting.pa':              'CAST(stats->>"$.hitting.pa" AS SIGNED)',
  'hitting.atBats':          'CAST(stats->>"$.hitting.atBats" AS SIGNED)',
  'hitting.runs':            'CAST(stats->>"$.hitting.runs" AS SIGNED)',
  'hitting.hits':            'CAST(stats->>"$.hitting.hits" AS SIGNED)',
  'hitting.doubles':         'CAST(stats->>"$.hitting.doubles" AS SIGNED)',
  'hitting.triples':         'CAST(stats->>"$.hitting.triples" AS SIGNED)',
  'hitting.homeRuns':        'CAST(stats->>"$.hitting.homeRuns" AS SIGNED)',
  'hitting.rbi':             'CAST(stats->>"$.hitting.rbi" AS SIGNED)',
  'hitting.sb':              'CAST(stats->>"$.hitting.sb" AS SIGNED)',
  'hitting.cs':              'CAST(stats->>"$.hitting.cs" AS SIGNED)',
  'hitting.bb':              'CAST(stats->>"$.hitting.bb" AS SIGNED)',
  'hitting.so':              'CAST(stats->>"$.hitting.so" AS SIGNED)',
  'hitting.bbPercent':       'CAST(stats->>"$.hitting.bbPercent" AS DECIMAL(10,3))',
  'hitting.soPercent':       'CAST(stats->>"$.hitting.soPercent" AS DECIMAL(10,3))',
  'hitting.po':              'CAST(stats->>"$.hitting.po" AS SIGNED)',
  'hitting.assists':         'CAST(stats->>"$.hitting.assists" AS SIGNED)',
  'hitting.outfieldAssists': 'CAST(stats->>"$.hitting.outfieldAssists" AS SIGNED)',
  'hitting.e':               'CAST(stats->>"$.hitting.e" AS SIGNED)',
  'hitting.avg':             'CAST(stats->>"$.hitting.avg" AS DECIMAL(10,3))',
  'hitting.obp':             'CAST(stats->>"$.hitting.obp" AS DECIMAL(10,3))',
  'hitting.slg':             'CAST(stats->>"$.hitting.slg" AS DECIMAL(10,3))',
  'hitting.ops':             'CAST(stats->>"$.hitting.ops" AS DECIMAL(10,3))',
  'hitting.wpa':             'CAST(stats->>"$.hitting.wpa" AS DECIMAL(10,3))',

  // pitching
  'pitching.wins':            'CAST(stats->>"$.pitching.wins" AS SIGNED)',
  'pitching.losses':          'CAST(stats->>"$.pitching.losses" AS SIGNED)',
  'pitching.winPercent':      'CAST(stats->>"$.pitching.winPercent" AS DECIMAL(10,3))',
  'pitching.era':             'CAST(stats->>"$.pitching.era" AS DECIMAL(10,3))',
  'pitching.starts':          'CAST(stats->>"$.pitching.starts" AS SIGNED)',
  'pitching.outs':            'CAST(stats->>"$.pitching.outs" AS DECIMAL(6,1))',
  'pitching.hits':            'CAST(stats->>"$.pitching.hits" AS SIGNED)',
  'pitching.runs':            'CAST(stats->>"$.pitching.runs" AS SIGNED)',
  'pitching.er':              'CAST(stats->>"$.pitching.er" AS SIGNED)',
  'pitching.homeRuns':        'CAST(stats->>"$.pitching.homeRuns" AS SIGNED)',
  'pitching.bb':              'CAST(stats->>"$.pitching.bb" AS SIGNED)',
  'pitching.so':              'CAST(stats->>"$.pitching.so" AS SIGNED)',
  'pitching.bbPercent':       'CAST(stats->>"$.pitching.bbPercent" AS DECIMAL(10,3))',
  'pitching.soPercent':       'CAST(stats->>"$.pitching.soPercent" AS DECIMAL(10,3))',
  'pitching.hbp':             'CAST(stats->>"$.pitching.hbp" AS SIGNED)',
  'pitching.battersFaced':    'CAST(stats->>"$.pitching.battersFaced" AS SIGNED)',
  'pitching.wpa':             'CAST(stats->>"$.pitching.wpa" AS DECIMAL(10,3))',
}



export  { DIAMONDS_PER_DAY, GameTeamFinance, PLAYER_STATS_SORT_EXPRESSION, TokenSeasonId, PlayerPercentileRatings, TeamCost, OwnerSorts, ContractType, TeamSeasonId, PlayerTransactionType, PitchResultGame, HitResultGame, LeagueBundle, PitcherChange, HitterChange, PitchChange, PromotionRelegationLog, MIN_AAV_CONTRACT, AVG_AAV_CONTRACT, MAX_AAV_CONTRACT, ROSTER_LOCK_HOUR, MINIMUM_PLAYER_POOL, TEAMS_PER_TIER, PlayerFinalContract, PlayerReport,
    LEASE_PER_CAPACITY, SERIES_LENGTH, WPAReward, WPA, MatchupHandedness, SimMatchupCommand, PlayResult, Play, ShallowDeep, Contact ,ShallowDeepChance,  FielderChance, InningEndingEvent,
    SwingResult, LastPlay, TeamInfo, HalfInning, UpcomingMatchup, BaseRunners, Count, Score, BaseRunnerIds, GamePlayerBio, OfficialPlayResult, LeagueAverageRatings,
    RunnerResult, HomeAway,HitterPitcher, PitchResultCount, HitResultCount, HittingHandednessRatings, PitchingHandednessRatings, Position, PitchType, ScheduleDetails, ScheduledGame, SeriesSchedule,Matchup, Schedule,
    Handedness, Rating, PitchRatings, HittingRatings, ContactProfile, GamePlayer, HitterStatLine, PitcherStatLine, PitchLog, PitchResult, RunnerEvent, Pitch, PitchCount,
    PitchProfile, BaseResult, DefensiveCredit, DefenseCreditType, LeagueAverage,ThrowRoll, InZoneByCount, OfficialRunnerResult, ThrowResult, BallTakeByCount, BallSwingByCount, StrikeSwingByCount, StrikeTakeByCount,HittingProfile, PitchingProfile, PitchRating, PlayerStatLines, PersonalityType }
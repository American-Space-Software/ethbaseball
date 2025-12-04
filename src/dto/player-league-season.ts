import { Table, Column, Model, DataType, AllowNull, Is, Length, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Season } from './season.js'
import { League } from './league.js'
import { Player } from './player.js'
import { HittingRatings, PitchRatings, PlayerPercentileRatings, PlayerStatLines, Position } from '../service/enums.js'
import { Team } from './team.js'

@Table({
    tableName: 'player_league_season',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class PlayerLeagueSeason extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @ForeignKey(() => Player)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare playerId?:string 

    @BelongsTo(() => Player)
    player: Player

    @ForeignKey(() => League)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare leagueId?:string 

    @BelongsTo(() => League)
    league: League

    @ForeignKey(() => Season)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare seasonId?:string 

    @BelongsTo(() => Season)
    season: Season
    
    @ForeignKey(() => Team)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare teamId?:string 

    @BelongsTo(() => Team)
    team: Team

    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare seasonIndex:number

    @AllowNull(false)
    @Column(DataType.STRING)
    declare primaryPosition:Position

    @AllowNull(false)
    @Column(DataType.DECIMAL(10,2))
    declare overallRating:number

    @AllowNull(false)
    @Column(DataType.DECIMAL(10,2))
    declare displayRating:number



    @AllowNull(false)
    @Is('CompletePitchRatings', validatePitchRatings)
    @Column(DataType.JSON)
    declare pitchRatings:PitchRatings

    @AllowNull(false)
    @Is('CompleteHittingRatings', validateHittingRatings)
    @Column(DataType.JSON)
    declare hittingRatings:HittingRatings

    @AllowNull(true)
    @Column(DataType.JSON)
    declare percentileRatings:PlayerPercentileRatings

    @AllowNull(true)
    @Column(DataType.JSON)
    declare stats: PlayerStatLines

    // @AllowNull(true)
    // @Column(DataType.JSON)
    // declare contractYear: ContractYear

    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare age:number


    @Column(DataType.DATE)
    declare startDate?:Date 

    @Column(DataType.DATE)
    declare endDate?:Date 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}




function inRange(value, min, max) {
    if (value < min) return false
    if (value > max) return false 
    return true
}




function validatePitchRatings(value:PitchRatings) {

    if (value.vsL.control == undefined || !inRange(value.vsL.control, 1, 1000)) {
        throw new Error(`Pitcher control invalid`);
    }

    if (value.vsL.movement == undefined || !inRange(value.vsL.movement, 1, 1000)) {
        throw new Error(`Pitcher movemement invalid`);
    }

    if (value.vsR.control == undefined || !inRange(value.vsR.control, 1, 1000)) {
        throw new Error(`Pitcher control invalid`);
    }

    if (value.vsR.movement == undefined || !inRange(value.vsR.movement, 1, 1000)) {
        throw new Error(`Pitcher movemement invalid`);
    }


    if (value.pitches.length < 1) {
        throw new Error(`Player must have at least 1 pitch`)
    }

    if (value.pitches.length > 5) {
        throw new Error(`Player must have a max of 3 pitches`)
    }

    // for (let pitch of value.pitches) {
    //     if (pitch.rating == undefined || pitch.type == undefined) {
    //         throw new Error('Missing pitch information.')
    //     }

    //     if (!inRange(pitch.rating, 1, 1000)) {
    //         throw new Error("Invalid pitch")
    //     }
    // }

    if (value.power == undefined || !inRange(value.power, 1, 1000)) {
        throw new Error(`Pitcher power invalid`)
    }

    // if (value.vsSameHand == undefined || !inRange(value.vsSameHand, 1, 1000)) {
    //     throw new Error(`Pitcher vsSameHand invalid`)
    // }

}

function validateHittingRatings(value:HittingRatings) {

    if (value.vsL.contact == undefined || !inRange(value.vsL.contact, 1, 1000)) {
        throw new Error(`Hitter contact invalid`);
    }

    if (value.vsL.gapPower == undefined || !inRange(value.vsL.gapPower, 1, 1000)) {
        throw new Error(`Hitter gap power invalid`);
    }

    if (value.vsL.homerunPower == undefined || !inRange(value.vsL.homerunPower, 1, 1000)) {
        throw new Error(`Hitter home run power invalid`);
    }

    if (value.vsL.plateDiscipline == undefined || !inRange(value.vsL.plateDiscipline, 1, 1000)) {
        throw new Error(`Hitter plate discipline invalid`)
    }


    if (value.vsR.contact == undefined || !inRange(value.vsR.contact, 1, 1000)) {
        throw new Error(`Hitter contact invalid`);
    }

    if (value.vsR.gapPower == undefined || !inRange(value.vsR.gapPower, 1, 1000)) {
        throw new Error(`Hitter gap power invalid`);
    }

    if (value.vsR.homerunPower == undefined || !inRange(value.vsR.homerunPower, 1, 1000)) {
        throw new Error(`Hitter home run power invalid`);
    }

    if (value.vsR.plateDiscipline == undefined || !inRange(value.vsR.plateDiscipline, 1, 1000)) {
        throw new Error(`Hitter plate discipline invalid`)
    }


    if (value.defense == undefined || !inRange(value.defense, 1, 1000)) {
        throw new Error(`Hitter defense invalid`)
    }



    if (value.speed == undefined || !inRange(value.speed, 1, 1000)) {
        throw new Error(`Hitter speed invalid`)
    }

    // if (value.vsSameHand == undefined || !inRange(value.vsSameHand, 1, 1000)) {
    //     throw new Error(`Hitter vsSameHand invalid`)
    // }

}


export {
    PlayerLeagueSeason
}


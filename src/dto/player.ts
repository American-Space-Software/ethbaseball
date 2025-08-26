import { Table, Column, Model, DataType, AllowNull, Is, Length, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Owner } from './owner.js'
import { Handedness, HittingProfile, HittingRatings, PersonalityType, PitchRatings, PitchType, PitcherStatLine, PitchingProfile, PlayerContract, PlayerLevel, PlayerPercentileRatings, PlayerStatLines, Position, Rating } from '../service/enums.js'

@Table({
    tableName: 'player',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Player extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @AllowNull(true)
    @Column(DataType.INTEGER)
    declare tokenId:number

    @Column(DataType.STRING)
    declare transactionHash?:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare firstName: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare lastName: string

    public get fullName() {
        return `${this.firstName} ${this.lastName}`
    }

    public get displayName() {
        return `${this.firstName.substring(0,1).toUpperCase()}. ${this.lastName}`
    }


    @AllowNull(false)
    @Column(DataType.STRING)
    declare primaryPosition:Position

    @AllowNull(false)
    @Column(DataType.STRING)
    declare zodiacSign:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare personalityType:PersonalityType

    @ForeignKey(() => Owner)
    @AllowNull(true)	
    @Column(DataType.STRING)
    declare ownerId:string 

    @AllowNull(false)
    @Is('CompletePitchProfile', validatePitchProfile)
    @Column(DataType.JSON)
    declare pitchingProfile:PitchingProfile

    @AllowNull(false)
    @Is('CompleteHittingProfile', validateHittingProfile)
    @Column(DataType.JSON)
    declare hittingProfile:HittingProfile

    @AllowNull(false)
    @Column(DataType.STRING)
    declare throws:Handedness

    @AllowNull(false)
    @Column(DataType.STRING)
    declare hits:Handedness

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    declare isRetired:boolean

    @AllowNull(true)
    @Column(DataType.JSON)
    declare careerStats: PlayerStatLines

    @AllowNull(true)
    @Column(DataType.JSON)
    declare contract: PlayerContract

    @AllowNull(true)
    @Column(DataType.JSON)
    declare completeContracts: PlayerContract[]

    @AllowNull(true)
    @Column(DataType.STRING)    
    declare coverImageCid?:string

    @AllowNull(false)
    @Column(DataType.DECIMAL(10,2))
    declare overallRating:number

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


    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare age:number

    @AllowNull(true)
    @Column(DataType.DATE)
    declare lastGamePitched:Date

    @AllowNull(true)
    @Column(DataType.DATE)
    declare lastGamePlayed:Date

    @AllowNull(true)	
    @Column(DataType.DATE)
    declare lastTeamChange?:Date 

    @Column(DataType.DATE)
    declare lastGameUpdate?:Date 

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

function validatePitchProfile(value:PitchingProfile) {

    if (value.controlDelta == undefined || !inRange(value.controlDelta, -10, 10)) {
        throw new Error(`Pitcher control invalid (profile) ${value.controlDelta}`)
    }

    if (value.movementDelta == undefined || !inRange(value.movementDelta,-10, 10)) {
        throw new Error(`Pitcher movemement invalid  (profile) ${value.movementDelta}`)
    }

    if (value.pitches.length < 1) {
        throw new Error(`Player must have at least 1 pitch (profile) ${value.pitches.length}`)
    }

    if (value.pitches.length > 5) {
        throw new Error(`Player must have a max of 3 pitches (profile) ${value.pitches.length}`)
    }

    for (let pitch of value.pitches) {

        if (pitch.ratingDelta == undefined || pitch.type == undefined) {
            throw new Error(`Missing pitch information. (profile) ${pitch.ratingDelta} ${pitch.type}`)
        }

        if (!inRange(pitch.ratingDelta, -10, 10)) {
            throw new Error(`Invalid pitch (profile) ${pitch.ratingDelta}`)
        }
    }

    if (value.powerDelta == undefined || !inRange(value.powerDelta,  -10, 10)) {
        throw new Error(`Pitcher power invalid (profile) ${value.powerDelta}`)
    }

    if (value.vsSameHandDelta == undefined || !inRange(value.vsSameHandDelta,  -10, 10)) {
        throw new Error(`Pitcher vsSameHand invalid (profile) ${value.vsSameHandDelta }`)
    }

}

function validateHittingProfile(value:HittingProfile) {

    if (value.contactDelta == undefined || !inRange(value.contactDelta, -10, 10)) {
        throw new Error(`Hitter contact invalid`);
    }

    if (value.gapPowerDelta == undefined || !inRange(value.gapPowerDelta,  -10, 10)) {
        throw new Error(`Hitter gap power invalid`);
    }

    if (value.homerunPowerDelta == undefined || !inRange(value.homerunPowerDelta,  -10, 10)) {
        throw new Error(`Hitter home run power invalid`);
    }

    if (value.defenseDelta == undefined || !inRange(value.defenseDelta,  -10, 10)) {
        throw new Error(`Hitter defense invalid`)
    }

    if (value.plateDisciplineDelta == undefined || !inRange(value.plateDisciplineDelta,  -10, 10)) {
        throw new Error(`Hitter plate discipline invalid`)
    }

    if (value.speedDelta == undefined || !inRange(value.speedDelta,  -10, 10)) {
        throw new Error(`Hitter speed invalid`)
    }

    if (value.vsSameHandDelta == undefined || !inRange(value.vsSameHandDelta,  -10, 10)) {
        throw new Error(`Hitter vsSameHand invalid`)
    }

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

    for (let pitch of value.pitches) {
        if (pitch.rating == undefined || pitch.type == undefined) {
            throw new Error('Missing pitch information.')
        }

        if (!inRange(pitch.rating, 1, 1000)) {
            throw new Error("Invalid pitch")
        }
    }

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
    Player
}


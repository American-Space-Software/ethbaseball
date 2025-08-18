import { Table, Column, Model, Index, PrimaryKey, ForeignKey, AllowNull, DataType, BelongsTo } from 'sequelize-typescript'
import { GameLevel, PitcherStatLine, Rating } from '../service/enums.js'

@Table({
    tableName: 'game_pitch_result',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false
})
class GamePitchResult extends Model {

    // @ForeignKey(() => Game)
    @PrimaryKey
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare gameId?:string 

    @AllowNull(false)	
    @Column(DataType.UUID)
    declare teamId?:string 

    @PrimaryKey
    @Column({ allowNull: false })
    @Column(DataType.UUID)
    declare playerId:string

    @Column({ allowNull: false })
    declare age:number

    @Column({ allowNull: false })
    declare teamWins:number

    @Column({ allowNull: false })
    declare teamLosses:number

    @Column({ allowNull: false })
    declare starts:number

    @Column({ allowNull: false })
    declare wins:number

    @Column({ allowNull: false })
    declare losses:number

    @Column({ allowNull: false })
    declare saves:number

    @Column({ allowNull: false })
    declare bs:number

    @Column({ allowNull: false })
    declare outs:number

    @Column({ allowNull: false })
    declare er:number

    @Column({ allowNull: false })
    declare so:number

    @Column({ allowNull: false })
    declare hits:number

    @Column({ allowNull: false })
    declare bb:number

    @Column({ allowNull: false })
    declare sho:number

    @Column({ allowNull: false })
    declare cg:number

    @Column({ allowNull: false })
    declare hbp:number

    @Column({ allowNull: false })
    declare singles:number

    @Column({ allowNull: false })
    declare doubles:number

    @Column({ allowNull: false })
    declare triples:number

    @Column({ allowNull: false })
    declare battersFaced:number

    @Column({ allowNull: false })
    declare atBats:number

    @Column({ allowNull: false })
    declare runs:number

    @Column({ allowNull: false })
    declare homeRuns:number

    @Column({ allowNull: false })
    declare groundOuts:number

    @Column({ allowNull: false })
    declare flyOuts:number

    @Column({ allowNull: false })
    declare lineOuts:number

    @Column({ allowNull: false })
    declare groundBalls:number

    @Column({ allowNull: false })
    declare lineDrives:number

    @Column({ allowNull: false })
    declare flyBalls:number

    @Column({ allowNull: false })
    declare sacFlys:number
    
    @AllowNull(true)
    @Column(DataType.DECIMAL(10, 5))
    declare wpa:number

    @Column({ allowNull: false })
    declare wildPitches:number


    @Column({ allowNull: false })
    declare pitches:number

    @Column({ allowNull: false })
    declare strikes:number

    @Column({ allowNull: false })
    declare balls:number

    @Column({ allowNull: false })
    declare fouls:number

    @Column({ allowNull: false })
    declare inZone:number

    @Column({ allowNull: false })
    declare swings:number

    @Column({ allowNull: false })
    declare swingAtBalls:number

    @Column({ allowNull: false })
    declare swingAtStrikes:number

    @Column({ allowNull: false })
    declare ballsInPlay:number

    @Column({ allowNull: false })
    declare inZoneContact:number

    @Column({ allowNull: false })
    declare outZoneContact:number

    @Column({ allowNull: false })
    declare totalPitchQuality: number

    @Column({ allowNull: false })
    declare totalPitchPowerQuality: number

    @Column({ allowNull: false })
    declare totalPitchLocationQuality: number

    @Column({ allowNull: false })
    declare totalPitchMovementQuality: number


    @AllowNull(true)	
    @Column(DataType.DECIMAL(10,2))
    declare overallRatingBefore:number

    @AllowNull(true)	
    @Column(DataType.DECIMAL(10,2))
    declare overallRatingAfter:number

    @AllowNull(true)	
    @Column(DataType.JSON)
    declare careerStats:{
        before: PitcherStatLine
        after: PitcherStatLine
    }

    level: GameLevel

    @Column(DataType.DATE)
    declare startDate?:Date

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}


interface PitchResult extends GamePitchResult {
    games?:number
    uniqueGames?:number
}


export {
    GamePitchResult, PitchResult
}
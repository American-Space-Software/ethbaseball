import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Unique, AllowNull } from 'sequelize-typescript'
import type { PitchEnvironmentTarget } from 'baseball-sim-engine'



@Table({
    tableName: 'league',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class League extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @Unique
    @Column(DataType.INTEGER)
    declare rank?: number

    @Column(DataType.STRING)
    declare name?: string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare baseDiamondReward?: string

    @AllowNull(true)
    @Column(DataType.JSON)
    declare pitchEnvironmentTarget?: PitchEnvironmentTarget    

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    League
}


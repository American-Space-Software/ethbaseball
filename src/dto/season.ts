import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Unique, ForeignKey, AllowNull } from 'sequelize-typescript'
import { PromotionRelegationLog } from '../service/enums.js'



@Table({
    tableName: 'season',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Season extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @Column(DataType.BOOLEAN)
    declare isComplete:boolean

    @Column(DataType.BOOLEAN)
    declare isInitialized:boolean

    @Column(DataType.JSON)
    declare promotionRelegationLog: PromotionRelegationLog[]

    @AllowNull(false)
    @Column(DataType.DATE)
    declare startDate: Date

    @AllowNull(true)
    @Column(DataType.DATE)
    declare endDate: Date

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
  Season
}


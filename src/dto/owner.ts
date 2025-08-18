import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AllowNull, AutoIncrement, Is, Length, Unique, Index, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Player } from './player.js'
import { DiamondMintPass } from './diamond-mint-pass.js'

@Table({
    tableName: 'owner',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Owner extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id:string

    @AllowNull(false)
    @Column(DataType.STRING(100))
    declare diamondBalance:string

    @AllowNull(false)
    @Column(DataType.DECIMAL)
    declare diamondBalanceDecimal:number

    @AllowNull(false)
    @Column(DataType.STRING(100))
    declare offChainDiamondBalance:string

    @AllowNull(false)
    @Column(DataType.DECIMAL)
    declare offChainDiamondBalanceDecimal:number

    @Column(DataType.BIGINT)
    declare count?:number

    @HasMany(() => Player)
    players: Player[]

    @Column(DataType.BIGINT)
    declare transactionCount?:number

    @Column(DataType.JSON)
    declare tokenIds?:number[]

    @Column(DataType.DATE)
    declare lastActive?:Date 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Owner
}


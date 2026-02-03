import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AutoIncrement, ForeignKey, AllowNull, BelongsTo } from 'sequelize-typescript'
import { ProcessedEvent, ProcessedTransaction } from './processed-transaction.js'

@Table({
    tableName: 'diamond_mint_pass',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class DiamondMintPass extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id?:string
    
    @Column(DataType.STRING)
    declare toUserId:string

    @Column(DataType.STRING)
    declare toAddress:string
    
    @Column(DataType.STRING)
    declare amount:string 

    @Column(DataType.BIGINT)
    declare expires:number 

    @Column(DataType.STRING)
    declare r:string 

    @Column(DataType.STRING)
    declare s:string 

    @Column(DataType.BIGINT)
    declare v:number 

    @ForeignKey(() => ProcessedTransaction)
    @AllowNull(true)	
    @Column(DataType.STRING)
    declare processedTransactionId?:string 

    @BelongsTo(() => ProcessedTransaction)
    processedTransaction: ProcessedTransaction

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date
}


export {
    DiamondMintPass
}
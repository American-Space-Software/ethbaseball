import {Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Index, ForeignKey, BelongsTo, AllowNull, BelongsToMany } from 'sequelize-typescript'
import { Game } from './game.js'
// import { ProcessedEvent } from './processed-transaction.js'



@Table({
    tableName: 'offchain_event',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class OffchainEvent extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id?:string

    @Column(DataType.STRING)
    declare contractType?:string

    @Column(DataType.STRING)
    declare amount?:string

    @Column(DataType.STRING)
    declare fromAddress?:string

    @Column(DataType.STRING)
    declare toAddress?:string


    @Column(DataType.STRING)
    declare fromTeamId?:string

    @Column(DataType.STRING)
    declare toTeamId?:string
    
    @Column(DataType.STRING)
    declare event?:string 

    @Index
    @ForeignKey(() => Game)
    @Column
    declare gameId: string

    @AllowNull(true)	
    @Column(DataType.STRING)
    declare processedEventId?:string 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    OffchainEvent
}
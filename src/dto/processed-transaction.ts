import {Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Index, ForeignKey, BelongsTo, AllowNull, BelongsToMany } from 'sequelize-typescript'

import { ERCEvent } from './erc-event.js'
import { Owner } from './owner.js'
import { BelongsToManyAddAssociationMixin, BelongsToManyRemoveAssociationMixin } from 'sequelize';
import { Team } from './team.js';
import { OffchainEvent } from './offchain-event.js';


@Table({
    tableName: 'processed_transaction',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class ProcessedTransaction extends Model {
    
    declare addToken: BelongsToManyAddAssociationMixin<Team, Team['_id']>;
    declare removeToken: BelongsToManyRemoveAssociationMixin<Team, Team['_id']>;

    declare addTokenTrader: BelongsToManyAddAssociationMixin<Owner, Owner['_id']>;
    declare removeTokenTrader: BelongsToManyRemoveAssociationMixin<Owner, Owner['_id']>;

    @PrimaryKey
    @Column(DataType.STRING)
    declare _id?:string

    @Column(DataType.STRING)
    declare _rev?:string 
    
    @Column(DataType.STRING)
    declare contractAddress?:string 

    @Index('block-number-transaction-index-pt') 
    @Column(DataType.BIGINT)
    declare blockNumber?:number

    @Index('block-number-transaction-index-pt') 
    @Column(DataType.BIGINT)
    declare transactionIndex?:number

    @Index('transactionFrom-pt') 
    @Column(DataType.STRING)
    declare transactionFrom?:string

    @Column(DataType.JSON)
    declare tokenTraderIds?:string[]

    @Column(DataType.JSON)
    declare diamondTraderIds?:string[]

    @Index
    @Column(DataType.BIGINT)
    declare timestamp?:number

    @Column(DataType.JSON)
    declare tokenIds?:number[]

    @BelongsToMany(() => Team, () => ProcessedTransactionToken)
    declare tokens: Team[]

    @BelongsToMany(() => Owner, () => ProcessedTransactionTrader)
    declare tokenTraders: Owner[]

    @BelongsToMany(() => Owner, () => ProcessedTransactionTrader)
    declare diamondTraders: Owner[]
    
    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}





@Table({
    tableName: 'processed_event',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class ProcessedEvent extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id?:string

    @Index('block-number-transaction-index-pe') 
    @Column(DataType.BIGINT)
    declare transactionIndex?:number

    @Index('block-number-transaction-index-pe') 
    @Column(DataType.BIGINT)
    declare blockNumber?:number

    @ForeignKey(() => ProcessedTransaction)
    @AllowNull(false)	
    @Column(DataType.STRING)
    declare processedTransactionId?:string 

    @BelongsTo(() => ProcessedTransaction)
    processedTransaction: ProcessedTransaction

    // @ForeignKey(() => OffchainEvent)
    @AllowNull(true)	
    @Column(DataType.STRING)
    declare offChainEventId?:string 

    // @BelongsTo(() => OffchainEvent)
    // offChainEvent: OffchainEvent


    @Column(DataType.STRING)
    declare contractAddress?:string

    @Column(DataType.BIGINT)
    declare logIndex?:number

    @Column(DataType.BOOLEAN)
    declare isMint?:boolean

    @Column(DataType.BOOLEAN)
    declare isBurn?:boolean

    @Column(DataType.BOOLEAN)
    declare isTransfer?:boolean

    @Column(DataType.JSON)
    declare namedArgs?:any

    @Column(DataType.STRING)
    declare amount?:string

    @Column(DataType.BIGINT)
    declare tokenId?:number

    @Column(DataType.STRING)
    declare fromAddress?:string

    @Column(DataType.STRING)
    declare toAddress?:string
    
    @Column(DataType.STRING)
    declare event?:string 

    @Column(DataType.STRING)
    declare data:string

    @Column(DataType.JSON)
    declare topics:string[] 


    @Column(DataType.JSON)
    declare args:string[] 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}




@Table({
    tableName: 'processed_transaction_token',
    paranoid: false,
})
class ProcessedTransactionToken extends Model {

  @Index
  @ForeignKey(() => ProcessedTransaction)
  @Column
  declare processedTransactionId: number

  @Index
  @ForeignKey(() => Team)
  @Column
  declare teamId: string

}



@Table({
    tableName: 'processed_transaction_trader',
    paranoid: false,
})
class ProcessedTransactionTrader extends Model {

  @Index
  @ForeignKey(() => ProcessedTransaction)
  @Column
  declare processedTransactionId: number

  @Index
  @ForeignKey(() => Owner)
  @Column
  declare ownerId: string

}

interface TransactionValue {
    totalPrice?: number
    usdValue?:number
    currency?: string
    tokenPrice?: TokenPrices,
    markets?: Markets
    aggregator?:string
    tokenIds?: number[]
}


interface Markets {
    [market: string]: {
        currencies: {
            [currency:string] : {
                price?:number
                usdValue?:number
            }
        }
    }
}

interface TokenPrice {
    price?:number
    currency?:string
    usdValue?:number
}

interface TokenPrices {
    [tokenId: string]: TokenPrice
}



export {
    ProcessedTransaction, ProcessedEvent, ProcessedTransactionToken, ProcessedTransactionTrader, TransactionValue
}
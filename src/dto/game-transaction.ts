import { Table, Column, Model, DataType, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { PlayerContract } from '../service/enums.js'
import { Season } from './season.js'
import { ProcessedEvent, ProcessedTransaction } from './processed-transaction.js'

@Table({
    tableName: 'game_transaction',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class GameTransaction extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @AllowNull(false)
    @Column(DataType.JSON)
    declare links: GameTransactionLinks

    @AllowNull(false)
    @Column(DataType.JSON)
    declare events: TransactionEvent[]

    @AllowNull(true)
    @Column(DataType.JSON)
    declare signingInfo: SigningInfo

    @ForeignKey(() => Season)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare seasonId?:string 

    @BelongsTo(() => Season)
    season: Season

    @AllowNull(false)
    @Column(DataType.DATE)
    declare date: Date


    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    declare isFinalized:boolean

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

interface GameTransactionLinks {
    teamTokenIds:number[]
    playerTokenIds:number[]
    leagueRanks:number[]
}

interface SigningInfo {
    message:string
    signature:string
}



interface TransactionEvent {

    team:{
        _id: string,
        tokenId: number
    }

    receiving?: {
        playerId?:string
        fromTeamId:string
        cash?:string
    }

    sending?: {
        playerId?:string
        toTeamId:string
        cash?:string
    }

    signing?: {
        playerId:string
        contract:PlayerContract
        isWaiver:boolean
    }

    dropping?: {
        playerId:string
    }

}

export {
    GameTransaction, SigningInfo
}


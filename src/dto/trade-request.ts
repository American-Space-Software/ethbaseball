import { Table, Column, Model, DataType, ForeignKey, AllowNull, BelongsTo } from "sequelize-typescript"

import { Team } from "./team.js"
import { TradeRequestStatus } from "../service/enums.js"


@Table({
    tableName: "trade_request",
    createdAt: "dateCreated",
    updatedAt: "lastUpdated",
    paranoid: false,
})
class TradeRequest extends Model {

    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare _id:string

    @ForeignKey(() => Team)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare fromTeamId:string

    @BelongsTo(() => Team, "fromTeamId")
    fromTeam:Team

    @ForeignKey(() => Team)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare toTeamId:string

    @BelongsTo(() => Team, "toTeamId")
    toTeam:Team

    @AllowNull(false)
    @Column(DataType.JSON)
    declare fromPackage:TradeRequestPackage

    @AllowNull(false)
    @Column(DataType.JSON)
    declare toPackage:TradeRequestPackage

    @AllowNull(false)
    @Column(DataType.STRING)
    declare status:TradeRequestStatus

    @AllowNull(true)
    @Column(DataType.DATE)
    declare expires?:Date

    @AllowNull(true)
    @Column(DataType.STRING)
    declare offChainEventTransactionId:string    

    @Column(DataType.DATE)
    declare lastUpdated?:Date

    @Column(DataType.DATE)
    declare dateCreated?:Date

}

interface TradeRequestPackage {
    playerIds:string[]
    diamonds:string
}

export {
    TradeRequest,
    TradeRequestPackage
}
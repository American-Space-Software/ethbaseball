import { Table, Column, Model, DataType, ForeignKey, AllowNull, BelongsTo } from "sequelize-typescript"

import { Team } from "./team.js"
import { User } from "./user.js"
import { Player } from "./player.js"
import { TeamMarketOfferStatus } from "../service/enums.js"

@Table({
    tableName: "team_market_offer",
    createdAt: "dateCreated",
    updatedAt: "lastUpdated",
    paranoid: false,
})
class TeamMarketOffer extends Model {

    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare _id:string

    @ForeignKey(() => User)
    @AllowNull(true)
    @Column(DataType.UUID)
    declare buyerUserId?:string

    @BelongsTo(() => User, "buyerUserId")
    buyerUser:User

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare sellerUserId:string

    @BelongsTo(() => User, "sellerUserId")
    sellerUser:User

    @ForeignKey(() => Team)
    @AllowNull(true)
    @Column(DataType.UUID)
    declare buyerPaymentTeamId?:string

    @BelongsTo(() => Team, "buyerPaymentTeamId")
    buyerPaymentTeam:Team

    @ForeignKey(() => Team)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare sellerPaymentTeamId:string

    @BelongsTo(() => Team, "sellerPaymentTeamId")
    sellerPaymentTeam:Team

    @ForeignKey(() => Player)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare salePlayerId:string

    @BelongsTo(() => Player, "salePlayerId")
    salePlayer:Player

    @AllowNull(false)
    @Column(DataType.STRING)
    declare diamondAmount:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare status:TeamMarketOfferStatus

    @AllowNull(true)
    @Column(DataType.DATE)
    declare expires?:Date

    @AllowNull(true)
    @Column(DataType.STRING)
    declare escrowTransactionId?:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare settlementTransactionId?:string

    @Column(DataType.DATE)
    declare lastUpdated?:Date

    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    TeamMarketOffer
}
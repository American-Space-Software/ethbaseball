import { Table,Column,Model,DataType,ForeignKey,AllowNull,BelongsTo} from 'sequelize-typescript'

import { Game } from './game.js'


@Table({
    tableName: 'game_notifications',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class GameNotifications extends Model {

    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare _id: string

    @ForeignKey(() => Game)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare gameId?: string

    @BelongsTo(() => Game)
    game: Game

    @AllowNull(true)
    @Column(DataType.JSON)
    declare updatesSent?: GameUpdatesSent

    @Column(DataType.BOOLEAN)
    declare isComplete:boolean   

    @Column(DataType.DATE)
    declare lastUpdated?: Date

    @Column(DataType.DATE)
    declare dateCreated?: Date
}


interface GameUpdatesSent {
    discordStarted: boolean
    discordEnded: boolean
}


export {
    GameNotifications,
    GameUpdatesSent
}
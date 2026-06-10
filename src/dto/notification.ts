import { Table, Column, Model, DataType, AllowNull, Default } from "sequelize-typescript"
import { NotificationChannel, NotificationEntityType, NotificationEventType, NotificationStatus } from "../service/enums.js"

@Table({
    tableName: "notification",
    createdAt: "dateCreated",
    updatedAt: "lastUpdated",
    paranoid: false,
})
class Notification extends Model {

    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare _id: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare entityType: NotificationEntityType

    @AllowNull(false)
    @Column(DataType.UUID)
    declare entityId: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare eventType: NotificationEventType

    @AllowNull(false)
    @Column(DataType.STRING)
    declare channel: NotificationChannel

    @AllowNull(false)
    @Default(NotificationStatus.PENDING)
    @Column(DataType.STRING)
    declare status: NotificationStatus

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    declare attempts: number

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare lastError?: string

    @AllowNull(true)
    @Column(DataType.DATE)
    declare processedAt?: Date

    @AllowNull(true)
    @Column(DataType.DATE)
    declare lastAttemptedAt?: Date

    @Column(DataType.DATE)
    declare lastUpdated?: Date

    @Column(DataType.DATE)
    declare dateCreated?: Date
}



export {
    Notification
}
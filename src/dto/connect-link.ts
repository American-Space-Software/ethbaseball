import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AllowNull, AutoIncrement, Is, Length, ForeignKey, BelongsTo, Default } from 'sequelize-typescript'

@Table({
    tableName: 'connect_link',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class ConnectLink extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare discordId: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare discordUsername: string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare discordMessageId: string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare discordChannelId: string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare discordGuildId: string

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}


export {
    ConnectLink
}


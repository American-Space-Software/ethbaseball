import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AllowNull, AutoIncrement, Is, Length, Unique, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { DiamondMintPass } from './diamond-mint-pass.js'

@Table({
    tableName: 'user',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class User extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
    })
    declare _id:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare address:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare discordId:string

    @Column(DataType.STRING)
    declare discordRefreshToken:string

    @Column(DataType.STRING)
    declare discordAccessToken:string

    @Column(DataType.JSON)
    declare discordProfile:any

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    User
}


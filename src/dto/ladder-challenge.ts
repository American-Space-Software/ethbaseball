import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Unique, ForeignKey, AllowNull, BelongsTo } from 'sequelize-typescript'
import { Team } from './team.js'
import { Game } from './game.js'


@Table({
    tableName: 'ladder-challenge',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class LadderChallenge extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string


    @ForeignKey(() => Team)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare fromId?:string 

    @BelongsTo(() => Team)
    from: Team



    @ForeignKey(() => Team)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare toId?:string 

    @BelongsTo(() => Team)
    to: Team

    
    @ForeignKey(() => Game)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare gameId?:string 

    @BelongsTo(() => Game)
    game: Game


    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    LadderChallenge
}


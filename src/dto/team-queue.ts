import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Unique, ForeignKey, AllowNull, BelongsTo } from 'sequelize-typescript'
import { Team } from './team.js'
import { League } from './league.js'



@Table({
    tableName: 'team_queue',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class TeamQueue extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @ForeignKey(() => Team)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare teamId?:string 

    @BelongsTo(() => Team)
    team: Team

    @ForeignKey(() => League)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare leagueId?:string 

    @BelongsTo(() => League)
    league: League


    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}



export {
    TeamQueue
}


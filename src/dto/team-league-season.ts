import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, ForeignKey, AllowNull, BelongsTo, Unique, Index } from 'sequelize-typescript'
import { League } from './league.js'

import { Season } from './season.js'
import { FinanceSeason, Lineup, OverallRecord, Team } from './team.js'
import { City } from './city.js'
import { Stadium } from './stadium.js'
import { Rating } from '../service/enums.js'
import { Image } from './image.js'


@Table({
    tableName: 'team_league_season',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class TeamLeagueSeason extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @ForeignKey(() => Team)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare teamId?:string 

    @BelongsTo(() => Team)
    team: Team

    @ForeignKey(() => League)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare leagueId?:string 

    @BelongsTo(() => League)
    league: League

    @ForeignKey(() => Season)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare seasonId?:string 

    @BelongsTo(() => Season)
    season: Season


    @ForeignKey(() => Image)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare logoId?:string 

    @BelongsTo(() => Image)
    logo: Image


    @AllowNull(false)
    @Column(DataType.JSON)
    declare financeSeason:FinanceSeason

    @AllowNull(false)
    @Column(DataType.JSON)
    declare longTermRating:Rating

    @AllowNull(false)
    @Column(DataType.JSON)
    declare seasonRating:Rating

    @AllowNull(false)
    @Column(DataType.JSON)
    declare overallRecord:OverallRecord

    @Column(DataType.DECIMAL(10, 5))
    declare fanInterestShortTerm?: number

    @Column(DataType.DECIMAL(10, 5))
    declare fanInterestLongTerm?: number

    @Column(DataType.BOOLEAN)
    declare hasValidLineup: boolean

    @ForeignKey(() => City)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare cityId?:string 

    @BelongsTo(() => City)
    city: City

    @ForeignKey(() => Stadium)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare stadiumId?:string 

    @BelongsTo(() => Stadium)
    stadium: Stadium
    

    @Column(DataType.JSON)
    declare lineups: Lineup[]


    
    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    TeamLeagueSeason
}




  


  
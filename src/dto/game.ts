import { Table, Column, Model, DataType, AllowNull, ForeignKey, BelongsTo, Index, BelongsToMany, PrimaryKey } from 'sequelize-typescript'
import { Player } from './player.js'
import { Count, HalfInning, LeagueAverage, Score, TeamInfo } from '../service/enums.js'
import { Team } from './team.js'
import { BelongsToManyAddAssociationMixin, BelongsToManyRemoveAssociationMixin } from 'sequelize';
import { Stadium } from './stadium.js';
import { League } from './league.js';
import { Season } from './season.js';



@Table({
    tableName: 'game',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Game extends Model {
    
    declare addTeam: BelongsToManyAddAssociationMixin<Team, Team['_id']>;
    declare removeTeam: BelongsToManyRemoveAssociationMixin<Team, Team['_id']>;

    @Column({
        primaryKey: true,
        type: DataType.UUID,
    })
    declare _id:string


    @Column(DataType.JSON)
    declare away: TeamInfo

    @Column(DataType.JSON)
    declare home: TeamInfo

    //Linescore
    @Column(DataType.JSON)
    declare count:Count

    @Column(DataType.JSON)
    declare score:Score

    @Column(DataType.JSON)
    declare halfInnings?: HalfInning[]

    @Column({
        allowNull: false,
    })
    declare playIndex: number

    @Column({
        allowNull: true,
        type: DataType.JSON
    })
    declare leagueAverages: LeagueAverage

    @Column(DataType.INTEGER)
    declare currentInning: number

    @Column(DataType.BOOLEAN)
    declare isStarted:boolean

    @Column(DataType.BOOLEAN)
    declare isTopInning: boolean

    @Column(DataType.BOOLEAN)
    declare isComplete:boolean

    @Column(DataType.BOOLEAN)
    declare isFinished:boolean

    @ForeignKey(() => Season)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare seasonId?:string 

    @BelongsTo(() => Season)
    season: Season
    
    @ForeignKey(() => League)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare leagueId?:string 

    @BelongsTo(() => League)
    league: League


    @AllowNull(true)	
    @Column(DataType.INTEGER)
    declare winningPitcherId?:string 

    @AllowNull(true)	
    @Column(DataType.INTEGER)
    declare losingPitcherId?:string 

    
    @ForeignKey(() => Team)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare winningTeamId?:string 

    @BelongsTo(() => Team)
    winningTeam: Team


    @ForeignKey(() => Team)
    @AllowNull(true)	
    @Column(DataType.UUID)
    declare losingTeamId?:string 

    @BelongsTo(() => Team)
    losingTeam: Team


    @ForeignKey(() => Stadium)
    @AllowNull(false)	
    @Column(DataType.UUID)
    declare stadiumId?:string 

    @BelongsTo(() => Stadium)
    stadium: Stadium

    @Column(DataType.JSON)
    declare gameFinances:GameFinances
    
    @BelongsToMany(() => Team, () => GameTeam)
    declare teams: Team[]

    @Column(DataType.DATE)
    declare currentSimDate?:Date 

    @Column(DataType.DATE)
    declare startDate?:Date 

    @Column(DataType.DATEONLY)
    declare gameDate?:Date 


    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Index 
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

@Table({
    tableName: 'game_team',
    paranoid: false,
})
class GameTeam extends Model {

  @Index
  @ForeignKey(() => Game)
  @Column
  declare gameId: string

  @Index
  @ForeignKey(() => Team)
  @Column
  declare teamId: string

}

@Table({
    tableName: 'game_player',
    paranoid: false,
})
class GamePlayer extends Model {

  @Index
  @PrimaryKey
  @ForeignKey(() => Game)
  @Column( {})
  declare gameId: string

  @Index
  @PrimaryKey
  @ForeignKey(() => Player)
  @Column
  declare playerId: string

}


interface GameTeamFinance {
    seasonTickets?: number
    gateTickets?: number
    totalAttendance?: number
    seasonTicketRevenue?: string
    gateTicketRevenue?: string
    nationalTvRevenue?: string
    localTvRevenue?: string
    totalRevenue?: string
    totalExpenses?:string
    totalProfit? :string

    payroll?:string
    stadiumLease?:string
}

interface GameFinances {
    home: GameTeamFinance
    away: GameTeamFinance
}

export {
    Game, GameTeam, GameFinances, GameTeamFinance, GamePlayer
}
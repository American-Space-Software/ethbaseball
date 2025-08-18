import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AutoIncrement, ForeignKey, AllowNull, BelongsTo } from 'sequelize-typescript'

@Table({
    tableName: 'team_mint_pass',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class TeamMintPass extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id?:string
    
    @Column(DataType.STRING)
    declare to:string
    
    @Column(DataType.BIGINT)
    declare tokenId:number 
    
    @Column(DataType.STRING)
    declare totalDiamonds:string 

    @Column(DataType.STRING)
    declare ethCost:string 

    @Column(DataType.BIGINT)
    declare expires:number 

    @Column(DataType.STRING)
    declare r:string 

    @Column(DataType.STRING)
    declare s:string 

    @Column(DataType.BIGINT)
    declare v:number 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date
}


export {
    TeamMintPass
}
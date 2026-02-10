import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AllowNull, AutoIncrement, Is, Length } from 'sequelize-typescript'

@Table({
    tableName: 'universe',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Universe extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare diamondAddress:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare adminAddress:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare minterAddress:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare name:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare symbol:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare ipfsCid:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare descriptionMarkdown:string

    @AllowNull(true)
    @Column(DataType.STRING)
    declare coverImageId:string

    @Column(DataType.DATE)
    declare currentDate:Date 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Universe
}


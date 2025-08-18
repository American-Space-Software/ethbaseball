import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AllowNull, AutoIncrement, Is, Length } from 'sequelize-typescript'
import { Player } from './player.js'

@Table({
    tableName: 'seed',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Seed extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id:string

    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare seed:number

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Seed
}


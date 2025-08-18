import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, Unique, ForeignKey, AllowNull } from 'sequelize-typescript'
import { Owner } from './owner.js'



@Table({
    tableName: 'stadium',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Stadium extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID
    })
    declare _id:string

    @ForeignKey(() => Owner)
    @AllowNull(true)	
    @Column(DataType.STRING)
    declare ownerId:string 

    @AllowNull(false)	
    @Column(DataType.INTEGER)
    declare capacity:number 

    @AllowNull(false)
    @Column(DataType.STRING)
    declare name: string

    // @AllowNull(false)
    // @Column(DataType.STRING)
    // declare location: string


    // @AllowNull(false)	
    // @Column(DataType.DECIMAL(10,2))
    // declare avgL:number 

    // @AllowNull(false)	
    // @Column(DataType.DECIMAL(10,2))
    // declare avgR:number

    // @AllowNull(false)	
    // @Column(DataType.DECIMAL(10,2))
    // declare doubles:number

    // @AllowNull(false)	
    // @Column(DataType.DECIMAL(10,2))
    // declare triples:number

    // @AllowNull(false)	
    // @Column(DataType.DECIMAL(10,2))
    // declare homerunsL:number 

    // @AllowNull(false)	
    // @Column(DataType.DECIMAL(10,2))
    // declare homerunsR:number

    @Column(DataType.STRING)
    declare transactionHash?:string


    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Stadium
}


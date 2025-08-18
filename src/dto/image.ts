import { Table, Column, Model, DataType, PrimaryKey, AllowNull } from 'sequelize-typescript'



@Table({
    tableName: 'image',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Image extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.STRING,
    })
    declare _id:string

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare svg?:string

    @AllowNull(true)
    @Column(DataType.BLOB)
    declare dataFull?:any

    @AllowNull(true)
    @Column(DataType.BLOB)
    declare data100x100?:any

    @AllowNull(true)
    @Column(DataType.BLOB)
    declare data1024x1024?:any

    @AllowNull(true)
    @Column(DataType.BLOB)
    declare data60x60?:any

    
    @AllowNull(false)
    @Column(DataType.STRING)
    declare cid?: string

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Image
}


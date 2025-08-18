import { Table, Column, Model, DataType, PrimaryKey, AllowNull } from 'sequelize-typescript'



@Table({
    tableName: 'post',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Post extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.STRING,
    })
    declare _id:string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare title:string

    @AllowNull(true)
    @Column(DataType.JSON)
    declare short?:any

    @AllowNull(false)
    @Column(DataType.JSON)
    declare content?:any

    @Column(DataType.BOOLEAN)
    declare isFeatured:boolean

    @Column(DataType.DATE)
    declare publishDate?:Date 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Post
}


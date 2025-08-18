import { Table, Column, Model, DataType, PrimaryKey, AllowNull } from 'sequelize-typescript'



@Table({
    tableName: 'animation',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Animation extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @AllowNull(false)
    @Column(DataType.TEXT)
    declare content?: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare cid?: string

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    Animation
}


import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, AllowNull, AutoIncrement, Is, Length, Unique, Index } from 'sequelize-typescript'

@Table({
    tableName: 'signature_token',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class SignatureToken extends Model {
    
    @PrimaryKey
    @Column(DataType.STRING)
    declare _id:string

    @AllowNull(true)
    @Column(DataType.STRING)
    @Index({ unique: true })
    declare token:string

    @Column(DataType.DATE)
    declare expires?:Date 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}

export {
    SignatureToken
}


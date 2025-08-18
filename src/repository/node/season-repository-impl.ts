import { inject, injectable } from "inversify"


import { Op } from "sequelize"
import { SeasonRepository } from "../season-repository.js"
import { Season } from "../../dto/season.js"


@injectable()
class SeasonRepositoryNodeImpl implements SeasonRepository {

    @inject("sequelize")
    private sequelize:Function

    async get(id: string, options?: any): Promise<Season> {
        return Season.findByPk(id, options)
    }

    async getMostRecentCompleted(options?: any): Promise<Season> {

        let query = {

            where: {
                isComplete: true
            },

            order: [
                ['startDate', 'DESC']
            ]
        }

        return Season.findOne(Object.assign(query, options))
    }

    async getMostRecent(options?: any): Promise<Season> {

        let query = {

            order: [
                ['startDate', 'DESC']
            ]
        }

        return Season.findOne(Object.assign(query, options))
    }

    async getCurrent(options?: any): Promise<Season> {

        let query = {
            where: {

                [Op.and]: [
                    {
                        startDate: {
                            [Op.gte]: new Date(new Date().toUTCString())
                        }
                    },
                    {
                        endDate: null
                    }
                ]


            },
            order: [
                ['startDate', 'DESC']
            ]
        }

        return Season.findOne(Object.assign(query, options))
    }

    async getByDate(date:Date, options?: any): Promise<Season> {

        let s = await this.sequelize()

        let queryOptions = {
            type: s.QueryTypes.RAW,
            plain: true,
            mapToModel: false,
            replacements: {
                theDate: date
            }
        }

        const [queryResults, metadata] = await s.query(`
            SELECT s._id
            FROM season s
            WHERE DATE(s.startDate) <= DATE(:theDate)
            AND (DATE(s.endDate) >= DATE(:theDate))
            ORDER BY s.startDate DESC
            LIMIT 1
        `, Object.assign(queryOptions, options))
        
        if (queryResults[0]?._id) {
            return this.get(queryResults[0]._id, options)
        }


    }

    async put(season: Season, options?: any): Promise<Season> {

        await season.save(options)
        return season

    }

    async list(limit: number, offset: number, options?: any): Promise<Season[]> {

        let query = {
            limit: limit,
            offset: offset,
            order: [
                ['startDate', 'DESC']
            ]
        }

        return Season.findAll(Object.assign(query, options))
    }

    async getByIds(ids: string[], options?: any): Promise<Season[]> {

        let queryOptions = {
            where: {
                _id: {
                    [Op.in]: ids
                }
            },
            order: [
                ['startDate', 'desc']
            ]
        }

        return Season.findAll(Object.assign(queryOptions, options))
    }


}


export {
    SeasonRepositoryNodeImpl
}
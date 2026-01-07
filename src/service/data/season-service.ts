import { inject, injectable } from "inversify";
;
import { SeasonRepository } from "../../repository/season-repository.js";
import { Season } from "../../dto/season.js";
import dayjs from "dayjs";
import { SeasonInfo } from "../enums.js";


@injectable()
class SeasonService {

    @inject("SeasonRepository")
    private seasonRepository:SeasonRepository

    constructor(
    ) {}

    async getMostRecent(options?: any): Promise<Season> {
        return this.seasonRepository.getMostRecent(options)
    }
    async getCurrent(options?: any): Promise<Season> {
        return this.seasonRepository.getCurrent(options)
    }

    async getMostRecentCompleted(options?: any): Promise<Season> {
        return this.seasonRepository.getMostRecentCompleted(options)
    }

    async getByDate(date:Date, options?: any): Promise<Season> {
        return this.seasonRepository.getByDate(date, options)
    }

    async get(id:string, options?:any): Promise<Season> {
        return this.seasonRepository.get(id, options)
    }
    async getByIds(ids:string[], options?:any): Promise<Season[]> {
        return this.seasonRepository.getByIds(ids, options)
    }

    async put(season:Season, options?:any) : Promise<Season> {
        return this.seasonRepository.put(season, options)

    }

    async list(limit:number, offset:number, options?:any) : Promise<Season[]> {
        return this.seasonRepository.list(limit, offset, options)
    }

    getSeasonInfo(season:Season, currentDate:Date) : SeasonInfo {

        const nowUtc = dayjs.utc()

        const start = dayjs(season.startDate).utc().startOf('day')
        const end = dayjs(season.endDate).utc().startOf('day')

        // inclusive season length (calendar days)
        const totalDays = end.diff(start, 'day') + 1

        // "league day" flips at 1:00 PM ET 
        const startDay = dayjs(currentDate).utc().format("YYYY-MM-DD")
        const startTimeUtc = dayjs.tz(`${startDay} 13:00`, "America/New_York").utc()

        // if we're past today's start time, treat it as the next league day
        const leagueDayUtc = (nowUtc.isSame(startTimeUtc) || nowUtc.isAfter(startTimeUtc))
            ? dayjs(currentDate).utc().add(1, 'day').startOf('day')
            : dayjs(currentDate).utc().startOf('day')

        // 1-indexed day number, clamped
        const rawDayNumber = leagueDayUtc.diff(start, 'day') + 1
        const dayNumber = Math.min(Math.max(rawDayNumber, 1), totalDays)

        // days remaining AFTER today
        const daysRemaining = Math.max(totalDays - dayNumber, 0)

        return {
            dayNumber: dayNumber,
            daysRemaining: daysRemaining,
            totalDays: totalDays
        }
    }


}



export {
    SeasonService
}
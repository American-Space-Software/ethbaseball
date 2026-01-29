import { inject, injectable } from "inversify";


@injectable()
class TeamSharedService {

    constructor() {}

    getTeamName(tls) {

        let isBot = tls.owner?._id == undefined

        let cityName = tls.city?.name ? tls.city.name : tls.cityName

        if (cityName) {
            return `${cityName} ${tls.name}${isBot ? ' 🤖' : ''}`
        }
        
        return `${tls.name}${isBot ? ' 🤖' : ''}`
    }


}

export {
    TeamSharedService
}
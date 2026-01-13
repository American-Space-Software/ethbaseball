import dayjs from "dayjs";
import { inject, injectable } from "inversify";


@injectable()
class OffChainEventWebService {

    constructor() {}

    getOffChainDescription (oce) {

        if (oce.event == "Transfer") {

            if (oce.toAddress == "0x0000000000000000000000000000000000000000") {

                if (oce.fromTokenId) {
                    return "Expenses"
                } else {
                    return "Created Mint Pass"
                }

            }
            if (oce.fromAddress == "0x0000000000000000000000000000000000000000") {

                if (oce.toTeamId) {

                    if (oce.source?.type == "reward" && oce.source?.rewardType == "daily") {
                        return `Daily reward`
                    } else if (oce.source?.type == "reward" && oce.source?.rewardType == "season") {
                        return `Season reward`

                    }
                }

                return "Reward"

            }
        }

    }


}

export {
    OffChainEventWebService
}
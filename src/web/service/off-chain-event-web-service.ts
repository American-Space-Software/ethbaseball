import { inject, injectable } from "inversify";


@injectable()
class OffChainEventWebService {

    constructor() {}

    getOffChainDescription (oce) {

        if (oce.event == "Transfer") {

            if (oce.toAddress == "0x0000000000000000000000000000000000000000") {

                if (oce.fromTokenId) {
                    return "Spent"
                } else {
                    return "Created Mint Pass"
                }

            }
            if (oce.fromAddress == "0x0000000000000000000000000000000000000000") return "Reward"
        }

    }


}

export {
    OffChainEventWebService
}
import { inject, injectable } from "inversify";
import { ContractStateRepository } from "../repository/contract-state-repository.js";
import { ContractState } from "../dto/contract-state.js";


@injectable()
class ContractStateService {

    @inject("ContractStateRepository")
    private contractStateRepository:ContractStateRepository

    constructor() {}


    async get(_id:string): Promise<ContractState> {        
        return this.contractStateRepository.get(_id)
    }

    async put(contractState:ContractState, options?:any) {
        return this.contractStateRepository.put(contractState, options)
    }

}

export {
    ContractStateService
}
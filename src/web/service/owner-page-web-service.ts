import axios from "axios";
import { injectable } from "inversify";
import { LeaderboardRowViewModel } from "../../service/data/owner-service.js";

@injectable()
class OwnerPageWebService {

  constructor() { }

  async getHome(): Promise<OwnerPage> {
    const response = await axios.get(`/sync/tokenOwner/pages/home.json`)
    return response.data
  }

  async getTotals(): Promise<TokenOwnerPageTotals> {
    const response = await axios.get(`/sync/tokenOwner/pages/total.json`)
    return response.data
  }

  async get(pageNumber: number): Promise<OwnerPage> {

    const response = await axios.get(`/sync/tokenOwner/pages/${pageNumber}.json`)

    return response.data
  }



}

interface TokenOwnerPageTotals {
  totalPages: number
  totalRecords: number
}



interface OwnerPage {
  owners?:LeaderboardRowViewModel[]
}

export {
  OwnerPageWebService
}
import { inject, injectable } from "inversify";


@injectable()
class PagingService {

    constructor(
    ) {}


    hasNextPage(pageSize, currentPage, items) {

        let startIndex = (currentPage + 1) * pageSize
        let endIndex = startIndex + 25

        let playerPage = items.slice(startIndex, endIndex)

        if (playerPage.length > 0) return true
        return false

    }

    hasPreviousPage (pageSize, currentPage, items) {

        let startIndex = (currentPage - 1) * pageSize
        let endIndex = startIndex + 25

        let playerPage = items.slice(startIndex, endIndex)

        if (playerPage.length > 0) return true
        return false

    }

    startIndex (pageSize, currentPage) {
        return currentPage * pageSize
    }

    endIndex (pageSize, currentPage) {
        return this.startIndex(pageSize, currentPage) + pageSize
    }



}

export {
    PagingService
}
import { inject, injectable } from "inversify";
import axios from "axios"
import { HitterPitcher, PitchType, PlayerGrade, Position } from "../../service/enums.js";
import { Player } from "../../dto/player.js";
import { UniverseWebService } from "./universe-web-service.js";
import { PlayerSharedService } from "../../service/shared/player-shared-service.js";



@injectable()
class PlayerWebService {

    constructor(
        private universeWebService:UniverseWebService,
        private playerSharedService:PlayerSharedService
    ) { }

    async dropPlayer(player:Player) {
    
        let result = await fetch(`/api/player/drop/${player._id}`, {
            method: 'POST'
        })
        
        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result

    }


    async signPlayer(player:Player) {
    
        let result = await fetch(`/api/player/sign/${player._id}`, {
            method: 'POST'
        })
        
        if (result.status != 200) {
            throw new Error(await result.text())
        }

        return result

    }

    async get(_id: number, startDate:string) {
        try {
            //Download it.
            let result = await axios.get(`/api/player/${_id}/${startDate}`)
            return result.data
        } catch (ex) {
            console.log(ex)
        }

    }

    async getPlayers(startDate:string, rank:number, page:number, position:Position|HitterPitcher, sortColumn:string, sortDirection:string) {
        //Download it.
        let result = await axios.get(`/api/player/list/${rank}/${startDate}/${page}?sortColumn=${sortColumn}&sortDirection=${sortDirection}&position=${position}`)
        return result.data
    }


    getPositionFull(position: Position) {

        switch (position) {
            case Position.PITCHER:
                return "Pitcher"
            case Position.CATCHER:
                return "Catcher"
            case Position.FIRST_BASE:
                return "First Base"
            case Position.SECOND_BASE:
                return "Second Base"
            case Position.THIRD_BASE:
                return "Third Base"
            case Position.SHORTSTOP:
                return "Shortstop"
            case Position.LEFT_FIELD:
                return "Left Field"
            case Position.CENTER_FIELD:
                return "Center Field"
            case Position.RIGHT_FIELD:
                return "Right Field"
        }
    }

    getPitchTypeFull(pitchType: PitchType) {
        switch (pitchType) {
            case PitchType.FF:
                return "Fastball"
            case PitchType.CU:
                return "Curveball"
            case PitchType.CH:
                return "Changeup"
            case PitchType.FC:
                return "Cutter"
            case PitchType.FO:
                return "Forkball"
            case PitchType.KN:
                return "Knuckleball"
            case PitchType.KC:
                return "Knuckle Curve"
            case PitchType.SC:
                return "Screwball"
            case PitchType.SI:
                return "Sinker"
            case PitchType.SL:
                return "Slider"
            case PitchType.SV:
                return "Slurve"
            case PitchType.FS:
                return "Splitter"
            case PitchType.ST:
                return "Slutter"  
            default:
                return pitchType
        }
    }

    sort($, e, elementClass, items) {

        $(`${elementClass} th`).removeClass("sort-active")
        $(e.srcElement).addClass('sort-active')

        let sortAttribute = $(e.srcElement).data('sort')

        //Get current sort.
        let currentSort = $(e.srcElement).data('direction') ? $(e.srcElement).data('direction') : "desc"

        //Flip it.
        if (currentSort == "desc") {
            currentSort = "asc"
        } else {
            currentSort = "desc"
        }

        $(e.srcElement).data('direction', currentSort)

        items.sort((first, second) => {

            // Dynamically evaluate the sort attribute expression in the context of the current item
            let aV = new Function('item', `return item.${sortAttribute}`)(first)
            let bV = new Function('item', `return item.${sortAttribute}`)(second)
    
            if (!aV) aV = 0
            if (!bV) bV = 0

            if (typeof (aV) == "number") {

                if (currentSort == "desc") {
                    return aV - bV
                } else {
                    return bV - aV
                }

            } else if (typeof (aV) == "string") {

                if (currentSort == "desc") {
                    if (bV < aV) return -1
                    else return 1
                } else {
                    if (aV < bV) return -1
                    else return 1
                }

            }

            return 0

        })

    }


    sortMultiple($, e, elementClass, itemLists) {

        $(`${elementClass} th`).removeClass("sort-active")
        $(e.srcElement).addClass('sort-active')

        let sortAttribute = $(e.srcElement).data('sort')

        //Get current sort.
        let currentSort = $(e.srcElement).data('direction') ? $(e.srcElement).data('direction') : "desc"

        //Flip it.
        if (currentSort == "desc") {
            currentSort = "asc"
        } else {
            currentSort = "desc"
        }

        $(e.srcElement).data('direction', currentSort)

        for (let items of itemLists) {

            items.sort((first, second) => {

                // Dynamically evaluate the sort attribute expression in the context of the current item
                let aV = new Function('item', `return item.${sortAttribute}`)(first)
                let bV = new Function('item', `return item.${sortAttribute}`)(second)
        
                if (!aV) aV = 0
                if (!bV) bV = 0
    
                if (typeof (aV) == "number") {
    
                    if (currentSort == "desc") {
                        return aV - bV
                    } else {
                        return bV - aV
                    }
    
                } else if (typeof (aV) == "string") {
    
                    if (currentSort == "desc") {
                        if (bV < aV) return -1
                        else return 1
                    } else {
                        if (aV < bV) return -1
                        else return 1
                    }
    
                }
    
                return 0
    
            })

        }

    }



    autoComplete(query, allPlayers) {

        if (query.length === 0) {
            return []
        }

        let matches = []

        matches.push(...allPlayers.filter(h => h.fullName.toLowerCase().indexOf(query.toLowerCase()) >= 0))

        matches.sort((a,b) => a.lastName.localeCompare(b) )

        return matches
    }


    getFutureContractValue(futureContract, index:number) {

        if (!futureContract) return ""

        let year = futureContract[index]

        if (year) {

            if (year.salary) {
                return this.universeWebService.displayDiamonds(futureContract[index].salary)
            } else {
                if (year.isPreArbitration) return "Minimum"
                if (year.isArbitration) return "Arbitration"
            }

        }

    }



    getAgeModifier(yearsOld: number): number {
        return this.playerSharedService.getAgeModifier(yearsOld)
    }


    getRatingBadgeColor(rating) {

        if (rating == null) return 'color-gray'

        if (rating >= 170) return 'color-green'   // A+
        if (rating >= 158) return 'color-green'   // A
        if (rating >= 146) return 'color-green'   // A-

        if (rating >= 134) return 'color-blue'    // B+
        if (rating >= 122) return 'color-blue'    // B

        if (rating >= 110) return 'color-yellow'  // B-
        if (rating >= 95)  return 'color-yellow'  // C+
        if (rating >= 83)  return 'color-yellow'  // C

        if (rating >= 71)  return 'color-orange'  // C-
        if (rating >= 59)  return 'color-orange'  // D+
        if (rating >= 47)  return 'color-orange'  // D

        if (rating >= 35)  return 'color-red'     // D-

        return 'color-red'                       // F
    }

    ratingToGrade(rating: number): PlayerGrade {

        return this.playerSharedService.ratingToGrade(rating)
    }

    getDisplayLevel(totalExperience: bigint) {
        return this.playerSharedService.getDisplayLevel(totalExperience)
    }

    getExperienceForDisplayLevel(displayLevel: number): bigint {
        return this.playerSharedService.getExperienceForDisplayLevel(displayLevel)
    }

    getDisplayLevelProgress(totalExperience: bigint): number {
        return this.playerSharedService.getDisplayLevelProgress(totalExperience)
    }  

    getNextDisplayLevel(totalExperience: bigint): number {
        return this.playerSharedService.getNextDisplayLevel(totalExperience)
    }

    getNextLevelExperience(totalExperience: bigint): bigint {
        return this.playerSharedService.getNextLevelExperience(totalExperience)
    }


}




export {
    PlayerWebService
}
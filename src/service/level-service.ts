import { injectable } from "inversify";
import { GameLevel, PlayerLevel } from "./enums.js"

@injectable()
class LevelService {

    constructor(
    ) {}


    getDisplayName(level:PlayerLevel) {

        switch(level) {
            case PlayerLevel.HIGH_SCHOOL_JUNIOR:
                return "High School (Junior)"

            case PlayerLevel.HIGH_SCHOOL_SENIOR:
                return "High School (Senior)"

            case PlayerLevel.JUNIOR_COLLEGE:
                return "Junior College"

            case PlayerLevel.COLLEGE_JUNIOR:
                return "College (Junior)"

            case PlayerLevel.COLLEGE_SENIOR:
                return "College (Senior)"

            case PlayerLevel.MINORS:
                return "The Minors"

            case PlayerLevel.PROS:
                return "The Pros"
        }

    }

    getLevel(playerLevel:PlayerLevel) {

        switch(playerLevel) {
            case PlayerLevel.HIGH_SCHOOL_JUNIOR:
                return GameLevel.HIGH_SCHOOL

            case PlayerLevel.HIGH_SCHOOL_SENIOR:
                return GameLevel.HIGH_SCHOOL

            case PlayerLevel.JUNIOR_COLLEGE:
                return GameLevel.JUNIOR_COLLEGE

            case PlayerLevel.COLLEGE_JUNIOR:
                return GameLevel.COLLEGE

            case PlayerLevel.COLLEGE_SENIOR:
                return GameLevel.COLLEGE

            case PlayerLevel.MINORS:
                return GameLevel.MINORS

            case PlayerLevel.PROS:
                return GameLevel.PROS
        }

    }


}




export {
    LevelService
}
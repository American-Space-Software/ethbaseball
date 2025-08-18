import { inject, injectable } from "inversify";



@injectable()
class FieldService {

    static homePlateX = -3
    static homePlateY = 67

    bases: Base[]
    runners: Runner[]
    positions: DefensivePosition[]
    defenders: Defender[]

    private sketch

    constructor() {
        this.runners = []
        this.defenders = []

        this.bases = [
            //Home
            {
                coordinates: {
                    x: 300,
                    y: 520
                },
                baseNumber: 0
            },

            //1B
            {
                coordinates: {
                    x: 365,
                    y: 450
                },
                baseNumber: 1
            },

            //2B
            {
                coordinates: {
                    x: 300,
                    y: 390
                },
                baseNumber: 2
            },

            //3B
            {
                coordinates: {
                    x: 235,
                    y: 450
                },
                baseNumber: 3
            },

            //Home
            {
                coordinates: {
                    x: 300,
                    y: 520
                },
                baseNumber: 4
            }

        ]

        this.positions = [
            //P
            {
                coordinates: {
                    x: 300,
                    y: 457
                },
                positionNumber: 1
            },

            //C
            {
                coordinates: {
                    x: 300,
                    y: 545
                },
                positionNumber: 2
            },

            //1B
            {
                coordinates: {
                    x: 365,
                    y: 433
                },
                positionNumber: 3
            },

            //2B
            {
                coordinates: {
                    x: 340,
                    y: 400
                },
                positionNumber: 4
            },

            //3B
            {
                coordinates: {
                    x: 240,
                    y: 430
                },
                positionNumber: 5
            },

            //SS
            {
                coordinates: {
                    x: 267,
                    y: 395
                },
                positionNumber: 6
            },

            //LF
            {
                coordinates: {
                    x: 150,
                    y: 250
                },
                positionNumber: 7
            },

            //CF
            {
                coordinates: {
                    x: 300,
                    y: 180
                },
                positionNumber: 8
            },

            //RF
            {
                coordinates: {
                    x: 440,
                    y: 250
                },
                positionNumber: 9
            }

        ]

    }

    drawField(sketch, defenders: Defender[], runners: Runner[]) {

        this.sketch = sketch

        this.sketch.angleMode(this.sketch.DEGREES);

        this.createField()

        //Draw defenders
        if (defenders.length > 0) {
            for (let i = 0; i < defenders.length; i++) {
                this.drawPlayer(defenders[i].player, defenders[i].coordinates)
            }
        }

        //Draw runners
        if (runners.length > 0) {
            for (let i = 0; i < runners.length; i++) {
                this.drawRunner(runners[i])
            }
        }

        //Draw batter
        // drawBatter("#cccccc", "#000000", 15, "R")


        // drawBatter("#cccccc", "#000000", 16, "L")


    }

    private createField() {

        this.sketch.background('#7fb35d');

        //Create alternating stripes
        this.createFieldGrass()

        this.sketch.resetMatrix();

        //Move to infield
        this.sketch.translate(300, 450);

        this.infieldDirt()

        this.infieldGrass()

        this.pitchersMound()

        this.createDirtBases()

        //Left batters box
        this.battersBox(-14, 63, 7, 16)

        //Right batters box
        this.battersBox(7, 63, 7, 16)

        this.createBases(6)

        this.sketch.resetMatrix();

        this.foulLines()

        //Fence
        this.fence()

        //Warning track
        this.warningTrack()
    }

    private infieldDirt() {

        //Infield dirt
        this.sketch.fill('#e6b07a');
        this.sketch.arc(0, -7, 170, 170, -180, 0, this.sketch.CHORD);
    }

    private infieldGrass() {
        //Infield grass
        this.sketch.rotate(45);
        this.sketch.fill('#7fb35d')
        this.sketch.rect(-37, -37, 83, 83);

        //Reset rotation. 
        this.sketch.rotate(-45);
    }

    private createFieldGrass() {

        this.sketch.translate(-680, 0);
        this.sketch.rotate(-45);

        for (var i = 0; i < 59; i = i + 1) {
            this.sketch.noStroke();
            this.sketch.fill('#90be70');
            // s increases from 0 to 29
            this.sketch.rect(i * 20, 0, 9, 3000);
        }

    }

    private pitchersMound() {
        //Pitcher's dirt.
        this.sketch.fill('#e6b07a');
        this.sketch.circle(0, 7, 30);

        //Pitcher's mound rubber
        this.sketch.fill('#FFFFFF')
        this.sketch.rect(-3, 6, 7, 2)
    }

    private foulLines() {
        //Foul lines
        this.sketch.stroke('#ffffff')
        this.sketch.strokeWeight(2)
        this.sketch.line(0, 235, 290, 512)
        this.sketch.line(600, 235, 310, 512)
    }

    private fence() {
        this.sketch.noFill()
        this.sketch.stroke('#3A322A')
        this.sketch.strokeWeight(3)
        this.sketch.arc(300, 235, 600, 400, -180, 0, this.sketch.OPEN);
    }

    private warningTrack() {
        this.sketch.stroke('#B38B62')
        this.sketch.strokeWeight(10)
        this.sketch.arc(300, 233, 586, 385, -180, 0, this.sketch.OPEN);
    }

    private battersBox(startX, startY, battersBoxWidth, battersBoxHeight) {

        this.sketch.stroke('#ffffff');
        this.sketch.strokeWeight(2);

        //top
        this.sketch.line(startX, startY, startX + battersBoxWidth, startY)

        //bottom
        this.sketch.line(startX, startY + battersBoxHeight, startX + battersBoxWidth, startY + battersBoxHeight)

        //left
        this.sketch.line(startX, startY, startX, startY + battersBoxHeight)

        //right
        this.sketch.line(startX + battersBoxWidth, startY, startX + battersBoxWidth, startY + battersBoxHeight)
    }

    private createDirtBases() {

        this.sketch.noStroke()
        this.sketch.fill('#e6b07a');

        //Home
        this.sketch.circle(0, 70, 45);

        //Second base
        this.sketch.circle(0, -60, 45)

        //First base
        this.sketch.rotate(-45)
        this.sketch.arc(43, 55, 55, 55, -180, 0, this.sketch.CHORD);
        this.sketch.rotate(45)


        // third base
        this.sketch.rotate(45)
        this.sketch.arc(-43, 55, 55, 55, -180, 0, this.sketch.CHORD);
        this.sketch.rotate(-45)
    }

    private createBases(baseWidth) {

        //Home plate
        this.sketch.noStroke()
        this.sketch.fill('#FFFFFF')
        this.sketch.rect(FieldService.homePlateX, FieldService.homePlateY, baseWidth, baseWidth / 2 + 1)
        this.sketch.triangle(FieldService.homePlateX, FieldService.homePlateY + 4, FieldService.homePlateX + baseWidth, FieldService.homePlateY + 4, 0, FieldService.homePlateY + 8)

        this.sketch.rotate(45);

        //First base
        this.sketch.square(45, -45, baseWidth)

        //Second base
        this.sketch.square(-45, -45, baseWidth)

        //Third base
        this.sketch.square(-45, 45, baseWidth)
    }

    drawPlayer(player: Player, coordinates: Coordinates) {

        if (!coordinates) return

        this.sketch.stroke(player.color1)
        this.sketch.strokeWeight(1)

        this.sketch.fill(player.color2);
        this.sketch.circle(coordinates.x, coordinates.y, 20)

        this.sketch.noStroke()
        this.sketch.fill(player.color1);
        this.sketch.textSize(10);

        if (player.jerseyName.toString().length == 2) {
            this.sketch.text(player.jerseyName, coordinates.x - 5, coordinates.y + 4);
        }

        if (player.jerseyName.toString().length == 1) {
            this.sketch.text(player.jerseyName, coordinates.x - 3, coordinates.y + 4);
        }

    }

    drawRunner(runner: Runner) {

        if (runner.running) {

            let target = this.getBaseByBaseNumber(runner.toBase)

            if (target) {

                //Move along the axis to the next base.
                runner.coordinates.x = this.sketch.lerp(runner.coordinates.x, target.coordinates.x, 0.05);
                runner.coordinates.y = this.sketch.lerp(runner.coordinates.y, target.coordinates.y, 0.05);

                let distance = Math.hypot(target.coordinates.x - runner.coordinates.x, target.coordinates.y - runner.coordinates.y)

                //Move us there when we get close.
                if (distance < 1.5) {
                    this.setRunnerBase(runner, target.baseNumber)
                }

            }

        }

        this.drawPlayer(runner.player, runner.coordinates)

    }

    createRunner(player: Player, baseNumber: number): Runner {

        let runner: Runner = {
            player: player,
            baseNumber: baseNumber,
            running: false,
            coordinates: { x: undefined, y: undefined }
        }

        this.setRunnerBase(runner, baseNumber)

        return runner

    }

    advanceRunner(runner: Runner) {

        if (runner.running) return

        //Set as running
        runner.running = true

        //Set our next path.
        runner.toBase = runner.baseNumber + 1

    }

    setRunnerBase(runner: Runner, baseNumber: number) {

        runner.baseNumber = baseNumber
        runner.running = false

        let base = this.getBaseByBaseNumber(baseNumber)

        runner.coordinates.x = base.coordinates.x
        runner.coordinates.y = base.coordinates.y
    }

    getBaseByBaseNumber(baseNumber: number): Base {
        return this.bases.filter(b => b.baseNumber == baseNumber)[0]
    }

    getPositionByPositionNumber(positionNumber: number): DefensivePosition {
        return this.positions.filter(p => p.positionNumber == positionNumber)[0]
    }

    setDefenderPosition(defender: Defender, positionNumber: number) {

        defender.position = this.getPositionByPositionNumber(positionNumber)

        defender.coordinates.x = defender.position.coordinates.x
        defender.coordinates.y = defender.position.coordinates.y
    }

    createDefender(player: Player, positionNumber: number): Defender {

        let position = this.getPositionByPositionNumber(positionNumber)

        let defender: Defender = {
            player: player,
            position: position,
            coordinates: {
                x: undefined,
                y: undefined
            }
        }

        this.setDefenderPosition(defender, positionNumber)

        return defender
    }

}



interface Coordinates {
    x: number
    y: number
}

interface Base {

    coordinates: Coordinates
    baseNumber: number

}


interface Defender {

    coordinates?: Coordinates
    position?: DefensivePosition
    player: Player

}

class DefensivePosition {

    coordinates: Coordinates
    positionNumber: number

    constructor(positionNumber) {
        this.positionNumber = positionNumber
    }
}

interface Player {

    color1: string
    color2: string
    jerseyName: number

}

interface Runner {

    coordinates?: Coordinates
    player: Player
    running?: boolean

    baseNumber?: number
    toBase?: number
}


export {
    FieldService
}
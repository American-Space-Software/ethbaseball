interface ContactTypeRollInput {
    groundball: number
    flyBall:number    
    lineDrive:number
}

interface FielderChanceRollInput {
    first:number
    second:number
    third:number
    catcher:number
    shortstop:number
    leftField:number
    centerField:number
    rightField:number
    pitcher:number
}

interface ShallowDeepRollInput {
    shallow:number
    normal: number
    deep: number
}


interface HitterHandednessRollInput {
    left:number
    right: number
    switch: number
}

interface PitcherHandednessRollInput {
    left:number
    right: number
}


interface PowerRollInput {
    out:number
    singles: number
    doubles: number
    triples: number
    hr: number
}



export {
    ContactTypeRollInput, FielderChanceRollInput, ShallowDeepRollInput, HitterHandednessRollInput, PitcherHandednessRollInput, PowerRollInput
}
import { Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DataType, PrimaryKey, ForeignKey, AllowNull, BelongsTo, Unique, Index } from 'sequelize-typescript'

import { DiamondMintPass } from './diamond-mint-pass.js'
import { User } from './user.js'
import { Colors, DevelopmentStrategy, Rating } from '../service/enums.js'




@Table({
    tableName: 'team',
    createdAt: 'dateCreated',
    updatedAt: 'lastUpdated',
    paranoid: false,
})
class Team extends Model {
    
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4        
    })
    declare _id:string

    @Column(DataType.UUID)
    declare mintKey?:string


    @Column(DataType.STRING(100))
    declare name?: string

    @Column(DataType.STRING(36))
    declare abbrev?: string

    @ForeignKey(() => User)
    @AllowNull(true)	
    @Column(DataType.STRING)
    declare userId?:string 

    @AllowNull(false)
    @Column(DataType.JSON)
    declare colors:Colors

    @AllowNull(false)
    @Column(DataType.JSON)
    declare longTermRating:Rating

    @AllowNull(false)
    @Column(DataType.JSON)
    declare seasonRating:Rating

    @AllowNull(false)
    @Column(DataType.JSON)
    declare developmentStrategy:DevelopmentStrategy
    
    @Column(DataType.DATE)
    declare lastGamePlayed?:Date 

    @Column(DataType.DATE)
    declare lastUpdated?:Date 
    
    @Column(DataType.DATE)
    declare dateCreated?:Date

}


const TEAM_NAMES = new Set([
    "Lynx",
    "Owls",
    "Foxes",
    "Hounds",
    "Wolves",
    "Gulls",
    "Elks",
    "Rams",
    "Hawks",
    "Bucks",
    "Crows",
    "Bears",
    "Stags",
    "Pikes",
    "Colts",

    "Squalls",
    "Waves",
    "Blizzards",
    "Tempest",
    "Gusts",
    "Stormers",
    "Breakers",
    "Tide",
    "Bolts",
    "Flame",
    "Surge",
    "Frost",
    "Gales",
    "Dew",
    "Mist",

    "Hammers",
    "Railers",
    "Steel",
    "Rivets",
    "Miners",
    "Millers",
    "Grinders",
    "Forge",
    "Tanners",
    "Dredgers",
    "Smiths",
    "Luggers",
    "Bricks",
    "Welders",
    "Drillers",

    "Bisons",
    "Clippers",
    "Arrows",
    "Jacks",
    "Coyotes",
    "Outlaws",
    "Rivals",
    "Barons",
    "Chargers",
    "Rustlers",
    "Ramblers",
    "Voyagers",
    "Trackers",
    "Pilots",
    "Trappers",

    "Striders",
    "Streaks",
    "Caps",
    "Sluggers",
    "Fire",
    "Storm",
    "Drift",
    "Summit",
    "Dash",
    "Blaze",
    "Crest",
    "Rush",
    "Flares",
    "Glint",
    "Mavericks",

    "Otters",
    "Jackals",
    "Mustangs",
    "Vultures",
    "Cobras",
    "Panthers",
    "Stingers",
    "Gophers",
    "Boars",
    "Marlins",
    "Herons",
    "Moose",
    "Prowlers",
    "Badgers",
    "Bantams",

    "Cyclones",
    "Typhoons",
    "Drifters",
    "Sunstreaks",
    "Zephyrs",
    "Tremors",
    "Embers",
    "Ridge",
    "Quakes",
    "Cinders",
    "Ferns",
    "Dunes",
    "Crest",
    "Brambles",
    "Torches",

    "Dockers",
    "Quarrymen",
    "Carvers",
    "Smelters",
    "Tinkers",
    "Gilders",
    "Masons",
    "Wrights",
    "Stackers",
    "Greasers",
    "Choppers",
    "Fellers",
    "Planers",
    "Pavers",

    "Wranglers",
    "Frontiers",
    "Pioneers",
    "Rustlers",
    "Settlers",
    "Lancers",
    "Drifters",
    "Nomads",
    "Mariners",
    "Wayfarers",
    "Corsairs",
    "Sentinels",
    "Renegades",
    "Mountaineers",
    "Explorers",

    "Torches",
    "Sparks",
    "Blitz",
    "Echo",
    "Pulse",
    "Comets",
    "Dart",
    "Grit",
    "Zest",
    "Nova",
    "Beacons",
    "Vortex",
    "Thrashers",
    "Sundogs",
    "Shock",

    "Jets",
    "Grind",
    "Thrust",
    "Bolt",
    "Core",
    "Flint",
    "Scorch",
    "Inferno",
    "Roar",
    "Churn",
    "Clash",
    "Torch",
    "Storm",
    "Brimstone",
    "Strike",

    "Cougars",
    "Jaguars",
    "Ravens",
    "Bobcats",
    "Lancers",
    "Falcons",
    "Vipers",
    "Rattlers",
    "Eagles",
    "Sharks",
    "Scorpions",
    "Barracudas",
    "Cranes",
    "Hornets",
    "Geckos",

    "Thunder",
    "Tsunamis",
    "Embers",
    "Horizon",
    "Ridgebacks",
    "Maelstrom",
    "Tundra",
    "Wildfire",
    "Gusts",
    "Avalanche",
    "Borealis",
    "Twisters",
    "Shoreline",
    "Hail",
    "Monsoon",

    "Smokestacks",
    "Mechanics",
    "Welders",
    "Blacksmiths",
    "Furnace",
    "Crafters",
    "Drafters",
    "Kilns",
    "Anvils",
    "Coopers",
    "Weavers",
    "Loggers",
    "Quenchers",
    "Ironworks",

    "Drifters",
    "Range",
    "Stampede",
    "Homesteaders",
    "Mustangs",
    "Waypoints",
    "Trailblazers",
    "Boomtown",
    "Surveyors",
    "Stockmen",
    "Wranglers",
    "Lone Stars",
    "Voyagers",
    "Ferries",
    "Timberjacks",

    "Launchers",
    "Strikes",
    "Bullets",
    "Cinders",
    "Torrents",
    "Rushers",
    "Vanguard",
    "Hustle",
    "Momentum",
    "Runners",
    "Slingers",
    "Charge",
    "Momentum",
    "Sliders",
    "Cascades",

    "Velocity",
    "Surge",
    "Quake",
    "Outburst",
    "Rumble",
    "Thunders",
    "Ripples",
    "Updraft",
    "Volt",
    "Fuse",
    "Hyper",
    "Turbine",
    "Spur",
    "Driftwood",
    "Roamers",

    "Mirage",
    "Halos",
    "Sonics",
    "Loom",
    "Eclipse",
    "Orbit",
    "Radiance",
    "Dynamo",
    "Momentum",
    "Zenith",
    "Aurora",
    "Tethers",
    "Momentum",
    "Comet",
    "Beacon"

])


const TEAM_COLORS = [
    {
      "color1": "#fa098a",
      "color2": "#eb2d5c"
    },
    {
      "color1": "#9fe5bf",
      "color2": "#e634a4"
    },
    {
      "color1": "#70b711",
      "color2": "#711e12"
    },
    {
      "color1": "#3ff706",
      "color2": "#f02167"
    },
    {
      "color1": "#1d04f4",
      "color2": "#6e65e7"
    },
    {
      "color1": "#819647",
      "color2": "#6c3cc2"
    },
    {
      "color1": "#680940",
      "color2": "#32ba43"
    },
    {
      "color1": "#16b00f",
      "color2": "#392a44"
    },
    {
      "color1": "#dabbf3",
      "color2": "#f1b94c"
    },
    {
      "color1": "#89be16",
      "color2": "#f3bd17"
    },
    {
      "color1": "#5b679e",
      "color2": "#b335da"
    },
    {
      "color1": "#7ea8a1",
      "color2": "#e9f191"
    },
    {
      "color1": "#f75fc9",
      "color2": "#0f4457"
    },
    {
      "color1": "#4eaa1a",
      "color2": "#d384e1"
    },
    {
      "color1": "#f5a9b7",
      "color2": "#c3a1ee"
    },
    {
      "color1": "#6f1c52",
      "color2": "#30ba86"
    },
    {
      "color1": "#984ccb",
      "color2": "#a38260"
    },
    {
      "color1": "#b6ea5c",
      "color2": "#644b30"
    },
    {
      "color1": "#5bd02c",
      "color2": "#7a7f3b"
    },
    {
      "color1": "#314bd0",
      "color2": "#ce29d1"
    },
    {
      "color1": "#e4640d",
      "color2": "#ef0854"
    },
    {
      "color1": "#ca377c",
      "color2": "#b900a8"
    },
    {
      "color1": "#62a4fc",
      "color2": "#ca1759"
    },
    {
      "color1": "#ad1bd5",
      "color2": "#5ce704"
    },
    {
      "color1": "#526859",
      "color2": "#369fd7"
    },
    {
      "color1": "#16c9a6",
      "color2": "#d684e8"
    },
    {
      "color1": "#74c543",
      "color2": "#3f90de"
    },
    {
      "color1": "#24db5a",
      "color2": "#8b1663"
    },
    {
      "color1": "#84964d",
      "color2": "#dbe94c"
    },
    {
      "color1": "#b85cc3",
      "color2": "#591d83"
    },
    {
      "color1": "#32526d",
      "color2": "#23971d"
    },
    {
      "color1": "#ef3a8e",
      "color2": "#122870"
    },
    {
      "color1": "#58e43c",
      "color2": "#bff0f7"
    },
    {
      "color1": "#3cbe3c",
      "color2": "#e728a7"
    },
    {
      "color1": "#540a24",
      "color2": "#d0edd8"
    },
    {
      "color1": "#f1f9c8",
      "color2": "#afe1ff"
    },
    {
      "color1": "#b6f9bd",
      "color2": "#2bcf92"
    },
    {
      "color1": "#c2c12e",
      "color2": "#5aa1e0"
    },
    {
      "color1": "#945638",
      "color2": "#520b66"
    },
    {
      "color1": "#c1965e",
      "color2": "#e804bf"
    },
    {
      "color1": "#9a5101",
      "color2": "#9272b0"
    },
    {
      "color1": "#eabe14",
      "color2": "#d91fa7"
    },
    {
      "color1": "#3792b1",
      "color2": "#e79ad9"
    },
    {
      "color1": "#eeb702",
      "color2": "#13d2d2"
    },
    {
      "color1": "#b20dd9",
      "color2": "#0b72d9"
    },
    {
      "color1": "#0c78c5",
      "color2": "#14e23b"
    },
    {
      "color1": "#d253e7",
      "color2": "#2d4f45"
    },
    {
      "color1": "#30c9ca",
      "color2": "#28b97e"
    },
    {
      "color1": "#07743e",
      "color2": "#791015"
    },
    {
      "color1": "#1fca78",
      "color2": "#2291f8"
    },
    {
      "color1": "#595d3f",
      "color2": "#aa7044"
    },
    {
      "color1": "#ff190f",
      "color2": "#01fa2b"
    },
    {
      "color1": "#1b929d",
      "color2": "#1b40ad"
    },
    {
      "color1": "#83f773",
      "color2": "#890787"
    },
    {
      "color1": "#a07d91",
      "color2": "#9e2292"
    },
    {
      "color1": "#fd2115",
      "color2": "#82cec9"
    },
    {
      "color1": "#3f5942",
      "color2": "#056ee8"
    },
    {
      "color1": "#620630",
      "color2": "#dc40b2"
    },
    {
      "color1": "#8ddffe",
      "color2": "#1f8de0"
    },
    {
      "color1": "#a74186",
      "color2": "#ba97ed"
    },
    {
      "color1": "#105013",
      "color2": "#4609de"
    },
    {
      "color1": "#23561b",
      "color2": "#d70ac9"
    },
    {
      "color1": "#8bd450",
      "color2": "#070428"
    },
    {
      "color1": "#4ff00a",
      "color2": "#70101b"
    },
    {
      "color1": "#52ba65",
      "color2": "#d9cd4b"
    },
    {
      "color1": "#2c5f0a",
      "color2": "#eb883b"
    },
    {
      "color1": "#86bcf5",
      "color2": "#48c77d"
    },
    {
      "color1": "#f30cc8",
      "color2": "#87df79"
    },
    {
      "color1": "#461939",
      "color2": "#7bd67c"
    },
    {
      "color1": "#92ea5b",
      "color2": "#aca44e"
    },
    {
      "color1": "#6a6267",
      "color2": "#b11588"
    },
    {
      "color1": "#ccbff0",
      "color2": "#712dc0"
    },
    {
      "color1": "#df657e",
      "color2": "#c1b5b9"
    },
    {
      "color1": "#cbe1aa",
      "color2": "#7afa51"
    },
    {
      "color1": "#37be14",
      "color2": "#61db14"
    },
    {
      "color1": "#7df66b",
      "color2": "#c3ddfd"
    },
    {
      "color1": "#caca09",
      "color2": "#1b9389"
    },
    {
      "color1": "#18b617",
      "color2": "#913273"
    },
    {
      "color1": "#7078ee",
      "color2": "#d75c4a"
    },
    {
      "color1": "#87e0d5",
      "color2": "#70fdf2"
    },
    {
      "color1": "#08438f",
      "color2": "#11d413"
    },
    {
      "color1": "#df8357",
      "color2": "#fb97c8"
    },
    {
      "color1": "#c9103a",
      "color2": "#e54718"
    },
    {
      "color1": "#d7accc",
      "color2": "#5227c5"
    },
    {
      "color1": "#d6b48d",
      "color2": "#6e0ebe"
    },
    {
      "color1": "#68f0e5",
      "color2": "#401b93"
    },
    {
      "color1": "#2d6397",
      "color2": "#591997"
    },
    {
      "color1": "#af312e",
      "color2": "#a5ca8c"
    },
    {
      "color1": "#bfc0fd",
      "color2": "#0b7618"
    },
    {
      "color1": "#98a0b2",
      "color2": "#7db7d2"
    },
    {
      "color1": "#dc2eb6",
      "color2": "#67c46d"
    },
    {
      "color1": "#e710e4",
      "color2": "#6d07f0"
    },
    {
      "color1": "#2e2fc9",
      "color2": "#f223ec"
    },
    {
      "color1": "#b0d1ec",
      "color2": "#f54523"
    },
    {
      "color1": "#1d8813",
      "color2": "#3307df"
    },
    {
      "color1": "#974737",
      "color2": "#dc88b8"
    },
    {
      "color1": "#8d59a2",
      "color2": "#fba920"
    },
    {
      "color1": "#144bdc",
      "color2": "#79a5a7"
    },
    {
      "color1": "#ab9e32",
      "color2": "#b5429b"
    },
    {
      "color1": "#6358ed",
      "color2": "#74c709"
    },
    {
      "color1": "#e2c053",
      "color2": "#e4ad72"
    },
    {
      "color1": "#6a7beb",
      "color2": "#51c891"
    },
    {
      "color1": "#0e1754",
      "color2": "#22bce1"
    },
    {
      "color1": "#c2ba47",
      "color2": "#91dc84"
    },
    {
      "color1": "#700938",
      "color2": "#57be7a"
    },
    {
      "color1": "#0e9c0a",
      "color2": "#511486"
    },
    {
      "color1": "#02e8a5",
      "color2": "#c0d723"
    },
    {
      "color1": "#35a25b",
      "color2": "#aa2d17"
    },
    {
      "color1": "#a840e2",
      "color2": "#ae276c"
    },
    {
      "color1": "#4e043d",
      "color2": "#97cb87"
    },
    {
      "color1": "#9951ba",
      "color2": "#1cf35c"
    },
    {
      "color1": "#8f41b5",
      "color2": "#83bee4"
    },
    {
      "color1": "#91b322",
      "color2": "#042235"
    },
    {
      "color1": "#e1790e",
      "color2": "#6acf3a"
    },
    {
      "color1": "#f3b77a",
      "color2": "#3395bb"
    },
    {
      "color1": "#185dd0",
      "color2": "#29aa4d"
    },
    {
      "color1": "#3196ce",
      "color2": "#c05752"
    },
    {
      "color1": "#8886d1",
      "color2": "#852851"
    },
    {
      "color1": "#ebe90a",
      "color2": "#a3de62"
    },
    {
      "color1": "#a2c400",
      "color2": "#d86c17"
    },
    {
      "color1": "#1bbd00",
      "color2": "#6d5744"
    },
    {
      "color1": "#4f1a66",
      "color2": "#fa28e7"
    },
    {
      "color1": "#c41c4a",
      "color2": "#cc4cbc"
    },
    {
      "color1": "#6db831",
      "color2": "#e387a2"
    },
    {
      "color1": "#3e447a",
      "color2": "#8a7889"
    },
    {
      "color1": "#cf0b32",
      "color2": "#dc5a80"
    },
    {
      "color1": "#67974c",
      "color2": "#622ded"
    },
    {
      "color1": "#a594fe",
      "color2": "#0a8d64"
    },
    {
      "color1": "#7314d4",
      "color2": "#d79148"
    },
    {
      "color1": "#487729",
      "color2": "#b14c37"
    },
    {
      "color1": "#ada44e",
      "color2": "#fa18bc"
    },
    {
      "color1": "#37c270",
      "color2": "#cdba92"
    },
    {
      "color1": "#aab4ee",
      "color2": "#dd7253"
    },
    {
      "color1": "#f42de9",
      "color2": "#3a6a28"
    },
    {
      "color1": "#40ca4c",
      "color2": "#ff14ed"
    },
    {
      "color1": "#ec37d9",
      "color2": "#048295"
    },
    {
      "color1": "#68972c",
      "color2": "#d07b06"
    },
    {
      "color1": "#020e91",
      "color2": "#a21685"
    },
    {
      "color1": "#9f0d60",
      "color2": "#667060"
    },
    {
      "color1": "#6b3f8b",
      "color2": "#49006d"
    },
    {
      "color1": "#08485c",
      "color2": "#97a07d"
    },
    {
      "color1": "#e76da7",
      "color2": "#705160"
    },
    {
      "color1": "#310af8",
      "color2": "#30b7c0"
    },
    {
      "color1": "#42001f",
      "color2": "#469651"
    },
    {
      "color1": "#3eb6d9",
      "color2": "#9c9fd5"
    },
    {
      "color1": "#12eb7a",
      "color2": "#8fdb8d"
    },
    {
      "color1": "#b32d6e",
      "color2": "#87e0b7"
    },
    {
      "color1": "#223404",
      "color2": "#79449f"
    },
    {
      "color1": "#7eadc0",
      "color2": "#49d71d"
    },
    {
      "color1": "#616c95",
      "color2": "#d86f18"
    },
    {
      "color1": "#ffe715",
      "color2": "#451a60"
    },
    {
      "color1": "#ec8a26",
      "color2": "#54f707"
    },
    {
      "color1": "#039c04",
      "color2": "#670670"
    },
    {
      "color1": "#95fa25",
      "color2": "#be84b1"
    },
    {
      "color1": "#115e0d",
      "color2": "#b309aa"
    },
    {
      "color1": "#d1553e",
      "color2": "#90f446"
    },
    {
      "color1": "#69f2e1",
      "color2": "#1c4b7d"
    },
    {
      "color1": "#67c359",
      "color2": "#53d0c9"
    },
    {
      "color1": "#5355d1",
      "color2": "#5ac6be"
    },
    {
      "color1": "#3fba3f",
      "color2": "#72b2ec"
    },
    {
      "color1": "#cb7645",
      "color2": "#a5834b"
    },
    {
      "color1": "#cc0df1",
      "color2": "#68c32c"
    },
    {
      "color1": "#8b5d19",
      "color2": "#47d797"
    },
    {
      "color1": "#c7b374",
      "color2": "#57feff"
    },
    {
      "color1": "#5229ae",
      "color2": "#b71655"
    },
    {
      "color1": "#01bff1",
      "color2": "#bc574e"
    },
    {
      "color1": "#32842b",
      "color2": "#dfd01e"
    },
    {
      "color1": "#1ea624",
      "color2": "#afd8ff"
    },
    {
      "color1": "#6ac765",
      "color2": "#f4863e"
    },
    {
      "color1": "#8203d9",
      "color2": "#a47b50"
    },
    {
      "color1": "#0f00d7",
      "color2": "#f58fad"
    },
    {
      "color1": "#774715",
      "color2": "#f49c7f"
    },
    {
      "color1": "#18540f",
      "color2": "#25d8b1"
    },
    {
      "color1": "#78c60c",
      "color2": "#abf2e9"
    },
    {
      "color1": "#d53e11",
      "color2": "#61fe34"
    },
    {
      "color1": "#d0a552",
      "color2": "#cedd9d"
    },
    {
      "color1": "#163b9a",
      "color2": "#b3bf6e"
    },
    {
      "color1": "#2866bc",
      "color2": "#fe9ac4"
    },
    {
      "color1": "#6bca25",
      "color2": "#49f917"
    },
    {
      "color1": "#17aa63",
      "color2": "#88d47f"
    },
    {
      "color1": "#9acaff",
      "color2": "#16ddfe"
    },
    {
      "color1": "#7ae71a",
      "color2": "#2777c6"
    },
    {
      "color1": "#369bc0",
      "color2": "#0dd3a2"
    },
    {
      "color1": "#e51c00",
      "color2": "#f1d5c1"
    },
    {
      "color1": "#a6afce",
      "color2": "#a707e2"
    },
    {
      "color1": "#b8dfbd",
      "color2": "#5cbb04"
    },
    {
      "color1": "#510269",
      "color2": "#d60cec"
    },
    {
      "color1": "#32dd71",
      "color2": "#d628a2"
    },
    {
      "color1": "#aa42b6",
      "color2": "#4ddca9"
    },
    {
      "color1": "#8a99bd",
      "color2": "#c14991"
    },
    {
      "color1": "#d754ea",
      "color2": "#36025b"
    },
    {
      "color1": "#19efba",
      "color2": "#f64d1b"
    },
    {
      "color1": "#85a368",
      "color2": "#364ce4"
    },
    {
      "color1": "#3a63d2",
      "color2": "#18095d"
    },
    {
      "color1": "#b1c8df",
      "color2": "#0f4af8"
    },
    {
      "color1": "#735350",
      "color2": "#96dd45"
    },
    {
      "color1": "#53507d",
      "color2": "#c6eaf0"
    },
    {
      "color1": "#992259",
      "color2": "#8305d4"
    },
    {
      "color1": "#b059a1",
      "color2": "#5f8316"
    },
    {
      "color1": "#5bba22",
      "color2": "#b82203"
    },
    {
      "color1": "#38e64c",
      "color2": "#0ef269"
    },
    {
      "color1": "#749565",
      "color2": "#f8a3c8"
    },
    {
      "color1": "#9ecc4e",
      "color2": "#3d2ba3"
    },
    {
      "color1": "#718922",
      "color2": "#66a69e"
    },
    {
      "color1": "#5d5614",
      "color2": "#8ecefb"
    },
    {
      "color1": "#ecac86",
      "color2": "#365fb5"
    },
    {
      "color1": "#7f36e7",
      "color2": "#2084e6"
    },
    {
      "color1": "#d1adfe",
      "color2": "#f07790"
    },
    {
      "color1": "#2eef8d",
      "color2": "#c8effe"
    },
    {
      "color1": "#a5c7e2",
      "color2": "#a01c84"
    },
    {
      "color1": "#46a656",
      "color2": "#be0330"
    },
    {
      "color1": "#55a62f",
      "color2": "#663251"
    },
    {
      "color1": "#0191f2",
      "color2": "#a63773"
    },
    {
      "color1": "#45a219",
      "color2": "#d9a132"
    },
    {
      "color1": "#09a23b",
      "color2": "#aca80e"
    },
    {
      "color1": "#eb8f1e",
      "color2": "#95e112"
    },
    {
      "color1": "#368392",
      "color2": "#6f2513"
    },
    {
      "color1": "#6cea19",
      "color2": "#4ac7aa"
    },
    {
      "color1": "#196b2e",
      "color2": "#80afb7"
    },
    {
      "color1": "#140e47",
      "color2": "#4458dc"
    },
    {
      "color1": "#c49eeb",
      "color2": "#bd0dfd"
    },
    {
      "color1": "#97394e",
      "color2": "#4c9be5"
    },
    {
      "color1": "#aeae02",
      "color2": "#dea060"
    },
    {
      "color1": "#2fb070",
      "color2": "#9ee870"
    },
    {
      "color1": "#624ff7",
      "color2": "#19b03d"
    },
    {
      "color1": "#140a93",
      "color2": "#69489a"
    },
    {
      "color1": "#18ee89",
      "color2": "#4d7a87"
    },
    {
      "color1": "#7f6a43",
      "color2": "#1eb678"
    },
    {
      "color1": "#f238a1",
      "color2": "#421e6e"
    },
    {
      "color1": "#77bbcb",
      "color2": "#f403b3"
    },
    {
      "color1": "#605639",
      "color2": "#692f7f"
    },
    {
      "color1": "#4d6200",
      "color2": "#72bd97"
    },
    {
      "color1": "#7e55f4",
      "color2": "#2d8ffd"
    },
    {
      "color1": "#cb26f2",
      "color2": "#3563e3"
    },
    {
      "color1": "#e0a1c0",
      "color2": "#1b023b"
    },
    {
      "color1": "#020830",
      "color2": "#fffdb0"
    },
    {
      "color1": "#7fdcc3",
      "color2": "#0d611c"
    },
    {
      "color1": "#d98642",
      "color2": "#6a0797"
    },
    {
      "color1": "#22b916",
      "color2": "#5399ec"
    },
    {
      "color1": "#cc09f4",
      "color2": "#394849"
    },
    {
      "color1": "#82607f",
      "color2": "#112f85"
    },
    {
      "color1": "#d62803",
      "color2": "#6c851a"
    },
    {
      "color1": "#24f621",
      "color2": "#f536be"
    },
    {
      "color1": "#7c53f2",
      "color2": "#187565"
    },
    {
      "color1": "#3cc1e1",
      "color2": "#4af5ae"
    },
    {
      "color1": "#858ec7",
      "color2": "#327cf6"
    },
    {
      "color1": "#4852f3",
      "color2": "#03c604"
    },
    {
      "color1": "#068d3c",
      "color2": "#62799d"
    },
    {
      "color1": "#0f70cd",
      "color2": "#85eed6"
    },
    {
      "color1": "#bfe78a",
      "color2": "#016d19"
    },
    {
      "color1": "#7deb85",
      "color2": "#2c7d37"
    },
    {
      "color1": "#3a22dd",
      "color2": "#e3ce26"
    },
    {
      "color1": "#66ad3a",
      "color2": "#ed4d4d"
    },
    {
      "color1": "#1e9b19",
      "color2": "#38ab46"
    },
    {
      "color1": "#2488c3",
      "color2": "#955f27"
    },
    {
      "color1": "#86b237",
      "color2": "#a87d3e"
    },
    {
      "color1": "#ffd900",
      "color2": "#760670"
    },
    {
      "color1": "#fc3de9",
      "color2": "#a8f65d"
    },
    {
      "color1": "#ae3366",
      "color2": "#4e170c"
    },
    {
      "color1": "#b933df",
      "color2": "#59c461"
    },
    {
      "color1": "#6f1878",
      "color2": "#980781"
    },
    {
      "color1": "#2f3b13",
      "color2": "#4c8913"
    },
    {
      "color1": "#8177a3",
      "color2": "#c30d83"
    },
    {
      "color1": "#5bf364",
      "color2": "#3e2128"
    },
    {
      "color1": "#ba9b8e",
      "color2": "#57ab5a"
    },
    {
      "color1": "#fea298",
      "color2": "#5210c3"
    },
    {
      "color1": "#98bec8",
      "color2": "#e713dc"
    },
    {
      "color1": "#76ea88",
      "color2": "#ff9a42"
    },
    {
      "color1": "#e62a24",
      "color2": "#95898b"
    },
    {
      "color1": "#116496",
      "color2": "#9f52d2"
    },
    {
      "color1": "#8b6e97",
      "color2": "#05e828"
    },
    {
      "color1": "#789f19",
      "color2": "#d413ea"
    },
    {
      "color1": "#924029",
      "color2": "#d9dd2f"
    },
    {
      "color1": "#8aa450",
      "color2": "#2e67df"
    },
    {
      "color1": "#eb89fe",
      "color2": "#0af39b"
    },
    {
      "color1": "#168b68",
      "color2": "#318a32"
    },
    {
      "color1": "#1f616a",
      "color2": "#1e5da1"
    },
    {
      "color1": "#d395fe",
      "color2": "#d0a18f"
    },
    {
      "color1": "#dbb8ce",
      "color2": "#86261d"
    },
    {
      "color1": "#8282bb",
      "color2": "#a3f1c5"
    }
]





export {
    Team, TEAM_NAMES, TEAM_COLORS,  DiamondMintPass

}


  


  
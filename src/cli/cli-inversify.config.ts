import "regenerator-runtime/runtime"
import "reflect-metadata"

import { Network, ethers } from "ethers"
import { Sequelize } from 'sequelize-typescript'
import { Container } from "inversify";
import readline from 'readline-promise'
import glicko2 from "glicko2"

import { UserIOService } from "../service/userio-service.js";
import { MainController } from "./controller/main-controller.js";
import { GameService } from "../service/game-service.js";
import { RollService } from "../service/roll-service.js";
import { PlayerService } from "../service/player-service.js";
import { PlayerRepositoryNodeImpl } from "../repository/node/player-repository-impl.js";
import { Player } from "../dto/player.js";
import { Game } from "../dto/game.js";
import { RollChartService } from "../service/roll-chart-service.js";
import { SchemaService } from "../service/schema-service.js";

import { Owner } from "../dto/owner.js";
import { OwnerService } from "../service/owner-service.js";
import { OwnerRepositoryNodeImpl } from "../repository/node/owner-repository-impl.js";
import { SeedRepositoryNodeImpl } from "../repository/node/seed-repository-impl.js";
import { Seed } from "../dto/seed.js";
import { SeedService } from "../service/seed-service.js";
import { LevelService } from "../service/level-service.js";


import { GameRepositoryNodeImpl } from "../repository/node/game-repository-impl.js";

import { StatService } from "../service/stat-service.js";
import { Animation } from "../dto/animation.js";
import { Image } from "../dto/image.js";
import { AnimationRepositoryNodeImpl } from "../repository/node/animation-repository-impl.js";
import { ImageRepositoryNodeImpl } from "../repository/node/image-repository-impl.js";
import { ImageService } from "../service/image-service.js";
import { AnimationService } from "../service/animation-service.js";
import { UniverseRepositoryNodeImpl } from "../repository/node/universe-repository-impl.js";
import { UniverseService } from "../service/universe-service.js";

import { Universe } from "../dto/universe.js";
import { ConnectLink } from "../dto/connect-link.js";
import { ConnectLinkRepositoryNodeImpl } from "../repository/node/connect-link-repository-impl.js";
import { ConnectService } from "../service/connect-service.js";
import { Team } from "../dto/team.js";


let rng

let container
let rlp

async function getContainer(command?:GetContainerCommand) {

    if (container) return container 

    container  = new Container()

    rlp = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    })


    container.bind("provider").toConstantValue(() => {
  
        if (command?.alchemy) {
          return new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${command.alchemy}`, Network.from(1), { staticNetwork: Network.from(1) })
        }
    
    })
    
    let sequelize

    container.bind('sequelize').toConstantValue(async () => {

        if (sequelize) {
            return sequelize
        }

        let database = "ebl"
        let host = process.env.MYSQL_HOST || "127.0.0.1"
        let user = process.env.MYSQL_USERNAME || "root"
        let password = process.env.MYSQL_PASSWORD || ""

        sequelize = new Sequelize(
            database,
            user,
            password,
             {
               logging: false,
               host: host,
               dialect: 'mysql',
               models: [Player, Team, Game, Owner, Seed, Universe, Animation, Image, ConnectLink]
             }
             
        )

        await sequelize.sync()

        await sequelize.authenticate()
        // console.log('Connection has been established successfully.')

        return sequelize

    })

    container.bind('rlp').toConstantValue(rlp)

    container.bind(PlayerService).toSelf().inSingletonScope()
    container.bind(RollService).toSelf().inSingletonScope()
    container.bind(RollChartService).toSelf().inSingletonScope()
    container.bind(SchemaService).toSelf().inSingletonScope()
    container.bind(OwnerService).toSelf().inSingletonScope()
    container.bind(SeedService).toSelf().inSingletonScope()
    container.bind(LevelService).toSelf().inSingletonScope()
    container.bind(StatService).toSelf().inSingletonScope()
    container.bind(ImageService).toSelf().inSingletonScope()
    container.bind(AnimationService).toSelf().inSingletonScope()
    container.bind(UniverseService).toSelf().inSingletonScope()
    container.bind(ConnectService).toSelf().inSingletonScope()


    container.bind(GameService).toSelf().inSingletonScope()
    container.bind(UserIOService).toSelf().inSingletonScope()
    container.bind(MainController).toSelf().inSingletonScope()

    container.bind("PlayerRepository").to(PlayerRepositoryNodeImpl).inSingletonScope()
    container.bind("OwnerRepository").to(OwnerRepositoryNodeImpl).inSingletonScope()
    container.bind("SeedRepository").to(SeedRepositoryNodeImpl).inSingletonScope()
    container.bind("GameRepository").to(GameRepositoryNodeImpl).inSingletonScope()

    container.bind("AnimationRepository").to(AnimationRepositoryNodeImpl).inSingletonScope()
    container.bind("ImageRepository").to(ImageRepositoryNodeImpl).inSingletonScope()
    container.bind("UniverseRepository").to(UniverseRepositoryNodeImpl).inSingletonScope()
    container.bind("ConnectLinkRepository").to(ConnectLinkRepositoryNodeImpl).inSingletonScope()


    return container
}

interface GetContainerCommand {
    alchemy:string
  }

export {
    getContainer, container, GetContainerCommand
}
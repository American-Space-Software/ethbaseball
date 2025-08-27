import { Container } from "inversify";
import Framework7 from 'framework7';

import dayjs from "dayjs"
import localizedFormat from 'dayjs/plugin/localizedFormat.js'

import relativeTime from 'dayjs/plugin/relativeTime.js'
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)


import AppComponent from './components/app.f7.html'

import { BrowserProvider } from "ethers"


import { RoutingService } from '../service/routing-service.js';
import { DiamondService } from '../service/diamond-service.js';

import { QueueService } from '../service/queue-service.js';
import { WalletServiceImpl } from "../service/wallet-service.js";
import { UiService } from "../service/ui-service.js";

import { LevelService } from "../service/level-service.js";
import { SeedService } from "../service/seed-service.js";
import { StatService } from "../service/stat-service.js";
import { PagingService } from "../service/paging-service.js";

import { HomeController } from "./controller/home-controller.js";
import { Fees } from "../dto/fees.js";

import c from '../../contracts.json' with { type: 'json' }



import Dialog from 'framework7/components/dialog'
import Popover from 'framework7/components/popover'
import Popup from 'framework7/components/popup'

import Stepper from 'framework7/components/stepper'
import Preloader from 'framework7/components/preloader'
import Toast from 'framework7/components/toast'
import Breadcrumbs from 'framework7/components/breadcrumbs'
import VirtualList from 'framework7/components/virtual-list'
import Checkbox from 'framework7/components/checkbox'
import Radio from 'framework7/components/radio'
import InfiniteScroll from 'framework7/components/infinite-scroll'
import SmartSelect from 'framework7/components/smart-select'
import Tabs from 'framework7/components/tabs'
import AutoComplete from 'framework7/components/autocomplete'
import SearchBar from 'framework7/components/searchbar'

import Input from 'framework7/components/input'
import Form from 'framework7/components/form'
import Accordion from 'framework7/components/accordion'
import Notification from 'framework7/components/notification'
import Picker from 'framework7/components/picker'
import Sheet from 'framework7/components/sheet'
import Swiper from 'framework7/components/swiper'
import Panel from 'framework7/components/panel'
import DataTable from 'framework7/components/data-table'



import { OwnerWebService } from "./service/owner-web-service.js";
import { PlayerWebService } from "./service/player-web-service.js";
import { TransactionWebService } from "./service/transaction-web-service.js";

Framework7.use([ DataTable, Panel, Swiper, Sheet, Picker, Notification, Accordion, AutoComplete, Dialog, Popover, Stepper, Preloader, Toast, Breadcrumbs, VirtualList, Input, Checkbox, Radio, InfiniteScroll, SmartSelect, Popup, Tabs, SearchBar, Form])


import TransactionRow from './components/common/transaction-row.f7.html'
// import LeaderboardRows from './components/user/leaderboard-rows.f7.html'

import HitterStats from './components/player/hitter-stats.f7.html'
import HitterRatings from './components/player/hitter-ratings.f7.html'
import HitterContracts from './components/player/hitter-contracts.f7.html'
import PitcherStats from './components/player/pitcher-stats.f7.html'
import PitcherRatings from './components/player/pitcher-ratings.f7.html'
import PitcherContracts from './components/player/pitcher-contracts.f7.html'

import { NewsController } from "./controller/news-controller.js";

import { PlayerController } from "./controller/player-controller.js";
import { OwnerPageWebService } from "./service/owner-page-web-service.js";
import { GameController } from "./controller/game-controller.js";
import { GameWebService } from "./service/game-web-service.js";
import { FieldService } from "../service/field-service.js";
import { LoginWebService } from "./service/login-web-service.js";
import { TeamController } from "./controller/team-controller.js";
import { TeamWebService } from "./service/team-web-service.js";
import { CityWebService } from "./service/city-web-service.js";
import { TeamComponentService } from "./service/team-component-service.js";
import { UniverseContractService } from "../service/universe-contract-service.js";
import { UniverseWebService } from "./service/universe-web-service.js";
import axios from "axios";
import { LineupService } from "../service/lineup-service.js";
import { GameTransactionWebService } from "./service/game-transaction-web-service.js";
import { LeagueController } from "./controller/league-controller.js";
import { LeagueWebService } from "./service/league-web-service.js";
import { DiamondWebService } from "./service/diamond-web-service.js";
import { PostWebService } from "./service/post-web-service.js";
import { UserController } from "./controller/user-controller.js";
import { OffChainEventWebService } from "./service/off-chain-event-web-service.js";
import { ActivityController } from "./controller/activity-controller.js";


Framework7.registerComponent("transaction-row", TransactionRow)
// Framework7.registerComponent("leaderboard-rows", LeaderboardRows)

Framework7.registerComponent("hitter-stats", HitterStats)
Framework7.registerComponent("hitter-ratings", HitterRatings)
Framework7.registerComponent("hitter-contracts", HitterContracts)

Framework7.registerComponent("pitcher-stats", PitcherStats)
Framework7.registerComponent("pitcher-ratings", PitcherRatings)
Framework7.registerComponent("pitcher-contracts", PitcherContracts)


let _diamondsAddress:string
let _universeAddress:string
let _fees:Fees
let _env

let container:Container

class GlobalEventTarget extends EventTarget {}

const eventTarget:GlobalEventTarget = new GlobalEventTarget()

async function getContainer(footerRoutes) {

    if (container) return container 

    let result = await axios.get(`/env`)
    let env = result.data

    setEnv(env)
    setDiamondsAddress(env.DIAMONDS_ADDRESS)
    setUniverseAddress(env.UNIVERSE_ADDRESS)

    container  = new Container()
    
    container.bind("footerRoutes").toConstantValue(footerRoutes)



    function framework7() {
        
        return new Framework7({
            el: '#app', // App root element
            id: 'ebl', // App bundle ID
            name: 'Ethereum Baseball League', // App name
            theme: 'ios', // Automatic theme detection
            component: AppComponent,
            iosTranslucentBars: false,
            smartSelect: {
                openIn: 'popup',
            },
            darkMode: "auto",
            // colors: {
            //     primary: "#0A3161"
            // },

            view: {
                browserHistory: true,
                browserHistorySeparator: "",
                browserHistoryOnLoad: false,
                browserHistoryInitialMatch: false
            },

        })
    
    }
    
    function contracts() {
      return c
    }
    
    container.bind("eventTarget").toConstantValue(eventTarget)
    container.bind("framework7").toConstantValue(framework7())
    container.bind("contracts").toConstantValue(contracts())
    container.bind("dayjs").toConstantValue(dayjs)


    container.bind("provider").toConstantValue(async () => {

        if (typeof window !== "undefined" && window['ethereum']) {
    
          //@ts-ignore
          window.web3Provider = window.ethereum
    
          return new BrowserProvider(window['ethereum'])
    
        } 
    
    })
      

    container.bind("getDiamondsAddress").toConstantValue(() => {
        return _diamondsAddress
    })

    container.bind("getUniverseAddress").toConstantValue(() => {
        return _universeAddress
    })



    container.bind("setDiamondsAddress").toConstantValue(setDiamondsAddress)
    container.bind("setUniverseAddress").toConstantValue(setUniverseAddress)
    container.bind("setEnv").toConstantValue(setEnv)

    container.bind("getFees").toConstantValue(() => {
        return _fees
    })

    container.bind("env").toConstantValue(() => {
        return _env
    })

    container.bind("name").toConstantValue("")
    container.bind("discord").toConstantValue("https://discord.gg/wVxk6mNUDs")

    container.bind(HomeController).toSelf().inSingletonScope()
    container.bind(PlayerController).toSelf().inSingletonScope()
    container.bind(GameController).toSelf().inSingletonScope()
    container.bind(TeamController).toSelf().inSingletonScope()
    container.bind(LeagueController).toSelf().inSingletonScope()
    container.bind(NewsController).toSelf().inSingletonScope()
    container.bind(UserController).toSelf().inSingletonScope()
    container.bind(ActivityController).toSelf().inSingletonScope()


    container.bind("WalletService").to(WalletServiceImpl).inSingletonScope()
    container.bind(RoutingService).toSelf().inSingletonScope()
    container.bind(LevelService).toSelf().inSingletonScope()
    container.bind(DiamondService).toSelf().inSingletonScope()
    container.bind(QueueService).toSelf().inSingletonScope()
    container.bind(UiService).toSelf().inSingletonScope()
    container.bind(SeedService).toSelf().inSingletonScope()
    container.bind(StatService).toSelf().inSingletonScope()
    container.bind(UniverseContractService).toSelf().inSingletonScope()
    container.bind(OwnerWebService).toSelf().inSingletonScope()
    container.bind(PlayerWebService).toSelf().inSingletonScope()
    container.bind(TransactionWebService).toSelf().inSingletonScope()
    container.bind(OwnerPageWebService).toSelf().inSingletonScope()
    container.bind(GameWebService).toSelf().inSingletonScope()
    container.bind(FieldService).toSelf().inSingletonScope()
    container.bind(PagingService).toSelf().inSingletonScope()
    container.bind(LoginWebService).toSelf().inSingletonScope()
    container.bind(TeamWebService).toSelf().inSingletonScope()
    container.bind(CityWebService).toSelf().inSingletonScope()
    container.bind(UniverseWebService).toSelf().inSingletonScope()
    container.bind(DiamondWebService).toSelf().inSingletonScope()
    container.bind(PostWebService).toSelf().inSingletonScope()

    container.bind(GameTransactionWebService).toSelf().inSingletonScope()

    container.bind(TeamComponentService).toSelf().inSingletonScope()
    container.bind(LeagueWebService).toSelf().inSingletonScope()

    container.bind(LineupService).toSelf().inSingletonScope()
    container.bind(OffChainEventWebService).toSelf().inSingletonScope()

    return container
}


const setEnv = (env) => {
    _env = env
}

const setDiamondsAddress = (diamonds) => {
    _diamondsAddress = diamonds
}

const setUniverseAddress = (universeAddress) => {
    _universeAddress = universeAddress
}

const setFees = (fees:Fees) => {
    _fees = fees
}


export {
    getContainer, container, setDiamondsAddress, setUniverseAddress, setFees, setEnv
}
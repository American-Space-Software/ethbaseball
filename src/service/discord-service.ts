import { inject, injectable } from 'inversify';

import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Client, EmbedBuilder,  Events,  InteractionResponse,  Message,  TextChannel,  bold } from 'discord.js';

import { Player } from '../dto/player.js';
import { ASCIIService } from './ascii-service.js';
import { ethers } from 'ethers';
import commands from "../engine/commands/commands.js"
import { UserService } from './data/user-service.js';
import { OffchainEventService } from './data/offchain-event-service.js';
import { TeamService } from './data/team-service.js';
import { SeasonService } from './data/season-service.js';
import { GameService } from './data/game-service.js';
import { TeamQueueService } from './data/team-queue-service.js';
import { UniverseService } from './universe-service.js';
import { LeagueService } from './data/league-service.js';
import { Universe } from '../dto/universe.js';
import { PlayerLeagueSeasonService } from './data/player-league-season-service.js';
import { TeamLeagueSeasonService } from './data/team-league-season-service.js';
import { User } from '../dto/user.js';
import { ContractType, SeasonInfo } from './enums.js';
import { Team } from '../dto/team.js';
import { TeamLeagueSeason } from 'src/dto/team-league-season.js';
import { PlayerLeagueSeason } from 'src/dto/player-league-season.js';
import { Season } from '../dto/season.js';
import { League } from '../dto/league.js';
import { RotationPitcher } from 'baseball-sim-engine/service/interfaces.js';
import { Game } from '../dto/game.js';



const NO_WALLET = "Not connected to wallet."


@injectable()
class DiscordService {

    public isStarted = false
    private playChannelId:string
    private marketplaceChannelId:string
    private web:string


    constructor(
        private userService:UserService,
        private offChainEventService:OffchainEventService,
        private asciiService:ASCIIService,
        private teamService:TeamService,
        private seasonSevice:SeasonService,
        private gameService:GameService,
        private seasonService:SeasonService,
        private teamQueueService:TeamQueueService,
        private universeService:UniverseService,
        private leagueService:LeagueService,
        @inject("discord") private discord:Client,
        @inject("universe") private universe:Universe,
        private playerLeagueSeasonService:PlayerLeagueSeasonService,
        private teamLeagueSeasonService:TeamLeagueSeasonService,    
    ) {}

    async start(discordToken:string, playChannelId:string, marketplaceChannelId:string, web:string, onReady?:Function) {

        if (!discordToken || !playChannelId || !marketplaceChannelId) return

        this.playChannelId = playChannelId
        this.marketplaceChannelId = marketplaceChannelId
        this.web = web

        //Start discord bot
        this.discord.on('ready', async () => {
            if (onReady) {
                await onReady()
            }
            
            console.log(`Logged in as ${this.discord?.user?.tag}!`)
        })
        
        this.discord.on(Events.InteractionCreate, async interaction => {

            if (!interaction.isChatInputCommand()) return

            const command = commands[interaction.commandName]
        
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return
            }
        
            //Call method with interaction name on controller. Pass in the interaction.
            try {

                // @ts-ignore - this is  
                await this[interaction.commandName](interaction)

            } catch (error) {

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }

            }

        })


        await this.discord.login(discordToken)

        this.isStarted = true

    }

    async help(interaction:ChatInputCommandInteraction) {

         await interaction.reply({ content: this.asciiService.getHelp(), ephemeral: true });
    }

    async balance(interaction:ChatInputCommandInteraction) {

        try {

            let user:User = await this.validateUser(interaction)


            let teams: Team[] = await this.teamService.getByUser(user)
            let team = teams[0]

            if (!team) throw new Error("Team not found.")


            let diamondBalance = await this.offChainEventService.getBalanceForTeamId(ContractType.DIAMONDS, team._id)
            
            await interaction.reply({ content: `Balance: ${displayDiamonds(diamondBalance)}`, ephemeral: true });

        } catch(ex:any) {
            await interaction.reply({ content: ex.message, ephemeral: true })

        }

    }

    async validateUser(interaction:ChatInputCommandInteraction) : Promise<User> {

        let user = await this.userService.getByDiscordId(interaction.user.id)  //this.ownerService.getByUserId(interaction.user.id)

        if (!user) {
            throw new Error("Visit https://playebl.com to start playing.")
        }

        return user
    }

    async roster(interaction:ChatInputCommandInteraction) {

        try {

            //Make sure they have a team
            let user:User = await this.validateUser(interaction)

            let teams: Team[] = await this.teamService.getByUser(user)
            let team = teams[0]

            let season = await this.seasonSevice.getMostRecent()
            let tls: TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season)

            let pageNumber = interaction.options.getInteger('page')
    
            if (pageNumber) {
                pageNumber = pageNumber - 1 //start at zero
            } else {
                pageNumber = 0
            }
    
            let limit = 20
            let offset = pageNumber * limit

            let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season)
            let plssPlain = plss.map(p => p.get({ plain: true }))


            let players:Player[] = plssPlain.map(p => p.player)
        
            //Sort so it matches ids order

            //@ts-ignore
            let orderedIds:string[] = tls.lineups[0].order?.map( o => o._id)?.concat(tls.lineups[0].rotation?.map( o => o._id))

            players.sort(function(a,b) {
                return orderedIds.indexOf( a._id ) - orderedIds.indexOf( b._id )
            })

            if (players?.length > 0) {
    
                //Show confirm?
                const response:InteractionResponse = await interaction.reply({ 
                    content: this.asciiService.getRoster(players, offset, players.length),
                    ephemeral: true
                })

            } else {

                await interaction.reply({ content: this.asciiService.getRosterError(), ephemeral: true })

            }

        } catch(ex:any) {
            console.log(ex)
            await interaction.reply({ content: ex.message, ephemeral: true })
        }



    }

    async joinqueue(interaction:ChatInputCommandInteraction) {

        try {

            const expandRange = interaction.options.getBoolean('expand')

            let universe:Universe = await this.universeService.getActive()

            let user:User = await this.validateUser(interaction)

            let season:Season = await this.seasonService.getMostRecent()

            let teams:Team[] = await this.teamService.getByUser(user)
            let team = teams[0]

            if (!team) {
                throw new Error("Team not found.")
            }

            let isQueued = await this.teamQueueService.isTeamQueued(team)

            if (isQueued) {
                throw new Error("Team is already queued.")
            }

            let tls:TeamLeagueSeason = await this.teamLeagueSeasonService.getByTeamSeason(team, season)

            if (!tls) {
                throw new Error("Team season not found.")
            }


            let seasonInfo:SeasonInfo = this.seasonService.getSeasonInfo(season, universe.currentDate)
            let gamesPlayed = tls.overallRecord.wins + tls.overallRecord.losses 

            const inProgressGames = await this.gameService.getInProgressByTeam(team)

            if (inProgressGames?.length > 0) {
                throw new Error("Can not join queue while team has a game in progress.")
            }

            if (gamesPlayed >= seasonInfo.dayNumber) {
                throw new Error("All caught up on games. Join the queue again at 9:30AM eastern time.")
            }


            let league:League = await this.leagueService.get(tls.leagueId)

            let plss: PlayerLeagueSeason[] = await this.playerLeagueSeasonService.getMostRecentByTeamSeason(team, season)
            let startingPitcher:RotationPitcher = this.teamService.getStartingPitcherFromPLS(tls.lineups[0].rotation, plss)

            this.teamService.validateLineup(team, tls.lineups[0], plss.map( pls => pls.get({ plain: true})), startingPitcher)


            let teamRating = (team.longTermRating.rating + team.seasonRating.rating) / 2


            await this.teamQueueService.queueTeam(team, league, teamRating, 25, expandRange)

            
            await interaction.reply({
                content: `✅ ${interaction.user} has successfully joined the queue (Rating: ${team.longTermRating.rating.toFixed(0)}).`,
                ephemeral: false
            })

        } catch(ex:any) {
            await interaction.reply({ content: ex.message, ephemeral: true })

        }

    }

    async leavequeue(interaction:ChatInputCommandInteraction) {

        let user:User = await this.validateUser(interaction)

        let teams:Team[] = await this.teamService.getByUser(user)
        let team = teams[0]

        if (!team) {
            throw new Error("Team not found.")
        }

        let isQueued = await this.teamQueueService.isTeamQueued(team)

        if (!isQueued) {
            throw new Error("Team is not queued.")
        }

        await this.teamQueueService.dequeueTeam(team)

        await interaction.reply({
            content: `You have left the queue.`,
            ephemeral: true
        })


    }

    async notifyGameStarted(game: Game, away: { team: Team, user: User }, home: { team: Team, user: User }) {

        const channel = await this.discord.channels.fetch(this.playChannelId)

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error('Play channel not found or is not a text channel')
        }

        const gameUrl = `${this.web}/g/${game._id}`

        const awayDisplay = await this.getDiscordDisplay(channel, away)
        const homeDisplay = await this.getDiscordDisplay(channel, home)

        await channel.send({
            content: `⚾ ${awayDisplay} vs ${homeDisplay} has started. [Watch live](${gameUrl})`
        })
    }

    async notifyGameFinished(game: Game, away: { team: Team, user: User }, home: { team: Team, user: User }) {

        const channel = await this.discord.channels.fetch(this.playChannelId)

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error('Play channel not found or is not a text channel')
        }

        const gameUrl = `${this.web}/g/${game._id}`

        const awayDisplay = await this.getDiscordDisplay(channel, away)
        const homeDisplay = await this.getDiscordDisplay(channel, home)

        let winningTeamDisplay = game.winningTeamId == away.team._id ? awayDisplay : homeDisplay
        let losingTeamDisplay = game.winningTeamId == away.team._id ? homeDisplay : awayDisplay

        let winningRuns = game.winningTeamId == away.team._id ? game.score.away : game.score.home
        let losingRuns = game.winningTeamId == away.team._id ? game.score.home : game.score.away


        await channel.send({
            content: `⚾ ${winningTeamDisplay} defeated ${losingTeamDisplay} by a score of ${winningRuns} to ${losingRuns}. [View recap](${gameUrl})`
        })
    }


    async notifyPlayerBuyOfferCreated(player: Player, diamondAmount: string, buyer: { team: Team, user: User }, seller: { team: Team, user: User }) {

        const channel = await this.discord.channels.fetch(this.marketplaceChannelId)

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error('Marketplace channel not found or is not a text channel')
        }

        const playerUrl = `${this.web}/p/${player._id}`

        const buyerDisplay = await this.getDiscordDisplay(channel, buyer)
        const sellerDisplay = await this.getDiscordDisplay(channel, seller)

        await channel.send({
            content: `📨 ${buyerDisplay} sent an offer to ${sellerDisplay} for **${player.fullName}** (${displayDiamonds(diamondAmount)}). [View player](${playerUrl})`
        })

    }

    async notifyPlayerBuyOfferAccepted(player: Player, diamondAmount: string, buyer: { team: Team, user: User }, seller: { team: Team, user: User }) {

        const channel = await this.discord.channels.fetch(this.marketplaceChannelId)

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error('Marketplace channel not found or is not a text channel')
        }

        const playerUrl = `${this.web}/p/${player._id}`

        const buyerDisplay = await this.getDiscordDisplay(channel, buyer)
        const sellerDisplay = await this.getDiscordDisplay(channel, seller)

        await channel.send({
            content: `🤝 ${sellerDisplay} accepted an offer from ${buyerDisplay} for **${player.fullName}** (${displayDiamonds(diamondAmount)}). [View player](${playerUrl})`
        })

    }

    async notifyPlayerBuyOfferCancelled(player: Player, diamondAmount: string, buyer: { team: Team, user: User }) {

        const channel = await this.discord.channels.fetch(this.marketplaceChannelId)

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error('Marketplace channel not found or is not a text channel')
        }

        const playerUrl = `${this.web}/p/${player._id}`

        const buyerDisplay = await this.getDiscordDisplay(channel, buyer)

        await channel.send({
            content: `❌ ${buyerDisplay} cancelled an offer for **${player.fullName}** (${displayDiamonds(diamondAmount)}). [View player](${playerUrl})`
        })

    }

    async notifyPlayerSaleListed(player: Player, diamondAmount: string, seller: { team: Team, user: User }) {

        const channel = await this.discord.channels.fetch(this.marketplaceChannelId)

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error('Marketplace channel not found or is not a text channel')
        }

        const playerUrl = `${this.web}/p/${player._id}`

        const sellerDisplay = await this.getDiscordDisplay(channel, seller)

        await channel.send({
            content: `🏷️ ${sellerDisplay} listed **${player.fullName}** for sale (${displayDiamonds(diamondAmount)}). [View player](${playerUrl})`
        })

    }


    async getDiscordDisplay(channel: TextChannel, info: { team: Team, user: User }): Promise<string> {

        const teamUrl = `${this.web}/t/${info.team._id}`

        try {
            await channel.guild.members.fetch(info.user.discordId)
            return `<@${info.user.discordId}>`
        } catch {
            return `[${info.team.name}](${teamUrl})`
        }
    }



    getDiscordSessionResetMs(error: unknown) {

      const message = error instanceof Error ? error.message : String(error ?? "")
      const match = message.match(/resets at ([0-9T:\-.]+Z)/i)

      if (!match) return null

      const resetMs = Date.parse(match[1])
      return Number.isNaN(resetMs) ? null : resetMs
      
    }


    // async player(interaction) {

    //     try {

    //         //Make sure they have a valid wallet
    //         // let owner:Owner = await this.validateWallet(interaction)

    //         let playerId = interaction.options.getInteger('id')

    //         let player:Player = await this.playerService.getByTokenIdWithTeam(playerId)

    //         if (player) {

    //             let animation = await this.animationService.generateAnimation(player)

    //             await this.generateImage(`${this._config().publicPath}/animations/png/${animation.cid}.html`)
                
    //             const file = new AttachmentBuilder(`${this._config().publicPath}/animations/png/${animation.cid}.png`)

    //             await interaction.reply({ files:[file] })

    //         } else {
    //             await interaction.reply({ content: this.asciiService.getPlayerError(), ephemeral: true })

    //         }

    //     } catch(ex) {
    //         // console.log(ex)
    //         await interaction.reply({ content: ex.message, ephemeral: true })        
    //     }

    // }

    async generateImage(animationPath:ChatInputCommandInteraction) {

        // const pngPath = animationPath.replace(".html", ".png")

        // if (!fs.existsSync(pngPath)) {
        //     console.time(`Generating PNG for HTML: ${animationPath}`)
        //     await this.playerService.generatePNGFromHTML(fs.readFileSync(animationPath).toString(), pngPath, 500, 500)
        //     console.timeEnd(`Generating PNG for HTML: ${animationPath}`)
        // }
    }

}


const formatDiamondValue = (value:string) => {

    if (value == null) return

    const trimZeros = (s) => s.replace(/\.?0+$/, '')

    const diamonds = ethers.formatUnits(value)
    const num = Number(diamonds)
    if (!Number.isFinite(num)) return diamonds

    if (num === 0) return "0"

    const abs = Math.abs(num)

    const fitPlain = (n) => {
        const intLen = Math.floor(Math.abs(n)).toString().length
        const remaining = 7 - intLen - 1
        let decimals = 1
        if (remaining > 0) decimals = Math.min(remaining, 6)
        let s = n.toFixed(decimals)
        if (s.length > 7 && decimals > 1) s = n.toFixed(decimals - 1)
        if (s.length > 7) s = n.toFixed(1)
        return s.length <= 7 ? s : null
    }

    const plain = fitPlain(num)
    if (plain) return trimZeros(plain)

    const formatAbbrev = (n, suffix, div) => {
        const v = n / div
        const intLen = Math.floor(v).toString().length
        const remaining = 7 - intLen - 1
        let decimals = 1
        if (remaining > 0) decimals = Math.min(remaining, 6)
        let s = v.toFixed(decimals)
        if (s.length > 7 && decimals > 1) s = v.toFixed(decimals - 1)
        if (s.length > 7) s = v.toFixed(1)
        if (s.length > 7) s = v.toFixed(0)
        return `${trimZeros(s)}${suffix}`
    }

    if (abs >= 1e9) return formatAbbrev(abs, 'B', 1e9)
    if (abs >= 1e6) return formatAbbrev(abs, 'M', 1e6)
    return formatAbbrev(abs, 'K', 1e3)
}

const displayDiamonds = (value) => {
    const formatted = formatDiamondValue(value)
    if (formatted == null) return
    return `${formatted} 🔷`
}

const displayDiamondsNoSymbol = (value) => {
    return formatDiamondValue(value)
}




export { DiscordService }




        // const helpEmbed = new EmbedBuilder()
        //             .setColor(0x0099FF)
        //             .setTitle('Available Game Commands')
        //             .addFields(
        //                 { name: 'Connect', value: '/connect' },
        //                 { name: 'Disconnect', value: '/disconnect' },
        //                 { name: 'Show Full Roster', value: '/roster page' },
        //                 { name: 'Scout Player', value: '/scout [P|C|1B|2B|3B|SS|LF|CF|RF] [red|blue]' },
        //                 { name: 'Show Player', value: '/player id' },
        //                 { name: 'Draft Team', value: '/draftteam [red|blue]' },
        //                 { name: 'Show Lineup List', value: '/lineups' },
        //                 { name: 'Show Lineup', value: '/lineup lineup' },
        //                 { name: 'Create Lineup', value: '/lineupcreate' },
        //                 { name: 'Add Player to Lineup', value: '/lineupadd id playerid' },
        //                 { name: 'Remove Player from Lineup', value: '/lineupremove id playerid' },
        //                 { name: 'Move Player to Spot', value: '/lineupmove id playerid spot' },
        //                 { name: 'Queue All', value: '/joinall' },
        //                 { name: 'Queue Player', value: '/join playerid' },
        //                 { name: 'Queue Lineup', value: '/joinlineup id' },
        //             )

        //             .setTimestamp()



        // interaction.channel.send({ embeds: [helpEmbed] })






        
//     async draft(interaction) {

//         try {

//             //Make sure they have a valid wallet
//             let owner:Owner = await this.validateWallet(interaction)
            
//             let fees:Fees = this.fees()

//             let balance = await this.diamondService.getBalance(owner._id)

//             if (balance < fees.draftFee) {
//                 throw new Error(`**Insufficient Balance** 
// Cost:      ${ethers.formatUnits(fees.draftFee.toString())} 💎 
// Balance: ${ethers.formatUnits(balance.toString())} 💎`)
//             }

//             //Validate 
//             const position = interaction.options.getString('position')
        
//             if (  !Object.values(Position).includes(position.toUpperCase() as Position)  ) {
//                 throw new Error("Invalid position selected.")
//             }
            
//             const confirm = new ButtonBuilder()
//                 .setCustomId('confirm')
//                 .setLabel('Confirm')
//                 .setStyle(ButtonStyle.Primary)

//             const cancel = new ButtonBuilder()
//                 .setCustomId('cancel')
//                 .setLabel('Cancel')
//                 .setStyle(ButtonStyle.Secondary)

//             const row = new ActionRowBuilder()
//                 .addComponents(cancel, confirm)

//             //Show confirm?
//             const response:InteractionResponse = await interaction.reply({ 
//                 content: `### Draft a player 
// Position: ${position.toUpperCase()}
// Draft Fee:       ${ethers.formatUnits(fees.draftFee.toString())}💎` ,
//                 components: [row],
//                 ephemeral: true
//             })

//             const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 180_000 });

//             if (confirmation.customId == "cancel") {

//                 await interaction.editReply({ content: 'Scouting trip cancelled.', components: [], ephemeral: true })

//             } else if (confirmation.customId == "confirm") {

//                 let player:Player  = await this.playerService.scoutPlayer({ 
//                     type: position as Position
//                 })

//                 await confirmation.deferReply()

//                 console.log(`Drafting player: ${player.fullName}`)

//                 try {

//                     await interaction.editReply({ content: 'Drafting player...', components: [], ephemeral: true })

//                     let playerMedia = await this.universeService.draft(player, owner)

//                     const file = new AttachmentBuilder(`${this._config().publicPath}/images/${playerMedia.image.cid}.png`)

//                     const transactionEmbed = new EmbedBuilder()
//                         .setColor(0x0099FF)
//                         .setURL(`${process.env.BLOCK_EXPLORER}/tx/${player.transactionHash}`)
//                         .setTitle('View Transaction')
//                         .setDescription(`\`\`\`Draft Fee: ${ethers.formatUnits(fees.draftFee.toString())} 💎
// Balance:   ${ethers.formatUnits((await this.diamondService.getBalance(owner._id)).toString())} 💎\`\`\``)


//                     const playerEmbed = new EmbedBuilder()
//                         .setColor(0x0099FF)
//                         .setTitle("Your scout discovered a player and they've been added to your roster.")
    
//                     await confirmation.deleteReply()

//                     await interaction.followUp({ content: '', embeds: [playerEmbed, transactionEmbed],  components: [], files: [file] })

//                     await interaction.deleteReply()


//                 } catch(ex) {
                    
//                     // console.log(ex)

//                     await confirmation.deleteReply()
//                     await interaction.editReply({ content: 'Error drafting player.',  components: [], ephemeral: true })
                
//                 }

//             }

//         } catch(ex) {
        
//             await interaction.reply({ content: ex.message, ephemeral: true })
        
//         }

//     }






//     async draftteam(interaction) {

//         try {

//             //Make sure they have a valid wallet
//             let owner:Owner = await this.validateWallet(interaction)
            
//             let fees:Fees = this.fees()

//             let balance = await this.diamondService.getBalance(owner._id)

//             if (balance < fees.draftFeeTeam) {
//                 throw new Error(`**Insufficient Balance** 
// Cost:      ${ethers.formatUnits(fees.draftFeeTeam.toString())} 💎 
// Balance: ${ethers.formatUnits(balance.toString())} 💎`)
//             }


//             const confirm = new ButtonBuilder()
//                 .setCustomId('confirm')
//                 .setLabel('Confirm')
//                 .setStyle(ButtonStyle.Primary)

//             const cancel = new ButtonBuilder()
//                 .setCustomId('cancel')
//                 .setLabel('Cancel')
//                 .setStyle(ButtonStyle.Secondary)

//             const row = new ActionRowBuilder()
//                 .addComponents(cancel, confirm)

//             //Show confirm?
//             const response:InteractionResponse = await interaction.reply({ 
//                 content: `### Draft a team of 8 hitters and 1 pitcher 
// Draft Fee:       ${ethers.formatUnits(fees.draftFeeTeam.toString())}💎` ,
//                 components: [row],
//                 ephemeral: true
//             })

//             const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 180_000 });

//             if (confirmation.customId == "cancel") {

//                 await interaction.editReply({ content: 'Team draft cancelled.', components: [], ephemeral: true })

//             } else if (confirmation.customId == "confirm") {

//                 await confirmation.deferReply()

//                 let players:Player[] = await this.playerService.scoutTeam()

//                 try {

//                     await interaction.editReply({ content: 'Drafting team...', components: [], ephemeral: true })

//                     let lineup:Lineup = await this.universeService.draftTeam(owner)

//                     const transactionEmbed = new EmbedBuilder()
//                         .setColor(0x0099FF)
//                         .setURL(`${process.env.BLOCK_EXPLORER}/tx/${players[0].transactionHash}`)
//                         .setTitle('View Transaction')
//                         .setDescription(`\`\`\`Draft Fee: ${ethers.formatUnits(fees.draftFeeTeam.toString())} 💎
// Balance:   ${ethers.formatUnits((await this.diamondService.getBalance(owner._id)).toString())} 💎\`\`\``)


//                     const lineupEmbed = new EmbedBuilder()
//                         .setColor(0x0099FF)
//                         .setTitle("Your scout discovered players and they've been added to your roster.")
//                         .setDescription(`A lineup has been created. #${lineup.index}
// ${ this.asciiService.getLineup(lineup) }`)
    
//                     await confirmation.deleteReply()

//                     await interaction.followUp({ content: '', embeds: [lineupEmbed, transactionEmbed],  components: [] })

//                     await interaction.deleteReply()


//                 } catch(ex) {
                    
//                     console.log(ex)

//                     await confirmation.deleteReply()
//                     await interaction.editReply({ content: 'Error drafting team.',  components: [], ephemeral: true })
                
//                 }

//             }

//         } catch(ex) {
        
//             await interaction.reply({ content: ex.message, ephemeral: true })
        
//         }


//     }
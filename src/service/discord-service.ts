import { inject, injectable } from 'inversify';
import { SchemaService } from './schema-service.js';
import { Owner } from '../dto/owner.js';

import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder,  Events,  InteractionResponse,  Message,  TextChannel,  bold } from 'discord.js';
import { OwnerService } from './owner-service.js';
import { ConnectService } from './connect-service.js';
import { Player } from '../dto/player.js';
import { PlayerService } from './player-service.js';
import { ASCIIService } from './ascii-service.js';
import { DiamondService } from './diamond-service.js';
import { ethers } from 'ethers';
import commands from "../engine/commands/commands.js"
import { AnimationService } from './animation-service.js';

import fs from "fs"


const NO_WALLET = "Not connected to wallet."


@injectable()
class DiscordService {

    hostname:string

    constructor(
        private schemaService:SchemaService,
        private ownerService:OwnerService,
        private playerService:PlayerService,
        private asciiService:ASCIIService,
        private diamondService:DiamondService,
        private animationService:AnimationService,
        @inject("config") private _config:Function,
        @inject("discord") private discord:Client
    ) {}

    async init(hostname:string) {
        this.hostname = hostname
        await this.schemaService.load()
    }

    async start(onReady?) {

        const TOKEN = process.env.DISCORD

        if (!TOKEN) return

        //Start discord bot
        this.discord.on('ready', async () => {
            if (onReady) {
                await onReady()
            }
            
            console.log(`Logged in as ${this.discord.user.tag}!`)
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

                await this[interaction.commandName](interaction)

            } catch (error) {

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }

            }

        })


        await this.discord.login(TOKEN)

    }

    async help(interaction) {

         await interaction.reply({ content: this.asciiService.getHelp(), ephemeral: true });
    }

    async balance(interaction) {

        try {

            let owner:Owner = await this.validateWallet(interaction)
            
            await interaction.reply({ content: `Wallet:   ${owner._id}
Balance: ${ethers.formatUnits((await this.diamondService.getBalance(owner._id)).toString())} 💎`, ephemeral: true });

        } catch(ex) {
            await interaction.reply({ content: ex.message, ephemeral: true })

        }

    }



    async validateWallet(interaction) : Promise<Owner> {

        let owner = await this.ownerService.getByUserId(interaction.user.id)

        if (!owner) {
            throw new Error(NO_WALLET)
        }

        return owner
    }

    async roster(interaction) {

        try {

            //Make sure they have a valid wallet
            let owner:Owner = await this.validateWallet(interaction)

            let pageNumber = interaction.options.getInteger('page')
    
            if (pageNumber) {
                pageNumber = pageNumber - 1 //start at zero
            } else {
                pageNumber = 0
            }
    
            let limit = 20
            let offset = pageNumber * limit

            let players:Player[] = await this.playerService.getByOwner(owner, { 
                limit: limit,
                offset: offset
            })
        

            if (players?.length > 0) {

                let total = await this.playerService.countByOwner(owner)
    
                //Show confirm?
                const response:InteractionResponse = await interaction.reply({ 
                    content: this.asciiService.getRoster(players, offset, total),
                    ephemeral: true
                })

            } else {

                await interaction.reply({ content: this.asciiService.getRosterError(), ephemeral: true })

            }

        } catch(ex) {
            console.log(ex)
            await interaction.reply({ content: ex.message, ephemeral: true })
        }



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

    async generateImage(animationPath) {

        // const pngPath = animationPath.replace(".html", ".png")

        // if (!fs.existsSync(pngPath)) {
        //     console.time(`Generating PNG for HTML: ${animationPath}`)
        //     await this.playerService.generatePNGFromHTML(fs.readFileSync(animationPath).toString(), pngPath, 500, 500)
        //     console.timeEnd(`Generating PNG for HTML: ${animationPath}`)
        // }
    }

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
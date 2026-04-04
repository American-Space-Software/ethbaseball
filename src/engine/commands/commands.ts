import { SlashCommandBuilder } from 'discord.js'

let commands: Record<string, any> = {}

commands['help'] =new SlashCommandBuilder()
							.setName('help')
							.setDescription('Display commands available for Ethereum Baseball League')

commands['balance'] = new SlashCommandBuilder()
							.setName('balance')
							.setDescription('Show diamond balance.')

commands['roster'] = new SlashCommandBuilder()
							.setName('roster')
							.setDescription('List players on roster.')

commands['joinqueue'] = new SlashCommandBuilder()
    .setName('joinqueue')
    .setDescription('Join the ranked online queue.')
    .addBooleanOption(option =>
        option
            .setName('expand')
            .setDescription('Expand range over time to find a game faster. May lower rewards.')
            .setRequired(false)
    )						

commands['leavequeue'] = new SlashCommandBuilder()
							.setName('leavequeue')
							.setDescription('Leave the ranked online queue.')

export default commands



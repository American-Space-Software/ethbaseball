import { SlashCommandBuilder } from 'discord.js'

let commands = {}

commands['help'] =new SlashCommandBuilder()
							.setName('help')
							.setDescription('Display commands available for Ethereum Baseball League')

commands['balance'] = new SlashCommandBuilder()
							.setName('balance')
							.setDescription('Show diamond balance.')

// commands['roster'] = new SlashCommandBuilder()
// 							.setName('roster')
// 							.setDescription('Display players on roster.')

// commands['player'] = new SlashCommandBuilder()
// 								.setName('player')
// 								.setDescription('Display player by ID.')
// 								.addIntegerOption(option => 

// 									option.setName('id')
// 										.setRequired(true)
// 										.setDescription('The ID of the player to display.')
// 								)



export default commands



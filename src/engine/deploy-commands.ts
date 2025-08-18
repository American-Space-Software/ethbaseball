import { Routes, REST } from 'discord.js';

import { getContainer } from "./inversify.config.js"

import commands from "./commands/commands.js";
let container = await getContainer()


const TOKEN = process.env.DISCORD
const DISCORD_OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID

const commandsData = []

for (let key of Object.keys(commands)) {
    commandsData.push(commands[key].toJSON())
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(TOKEN)

try {
    console.log(`Started refreshing ${commandsData.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data:any = await rest.put(
        Routes.applicationCommands(DISCORD_OAUTH_CLIENT_ID ),
        { body: commandsData }
    )

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);

} catch (error) {

    // And of course, make sure you catch and log any errors!
    console.error(error)

}
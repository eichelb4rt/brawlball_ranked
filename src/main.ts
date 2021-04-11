import Discord, { Message } from "discord.js";
import Command from "./interfaces/Command";
import CommandLoader from "./CommandLoader";
import Config from "./Config";

export const client = new Discord.Client();
export const command_loader = new CommandLoader();

export function main() {
	client.once("ready", () => {
		console.log("Ready!");
	});
	
	client.on("message", (message: Message) => {
		command_loader.getCommandList().forEach((command: Command) => command.onMessage(message));
	});
	
	client.login(Config.DISCORD_API_TOKEN);
}

if (require.main === module) {
    main();
}
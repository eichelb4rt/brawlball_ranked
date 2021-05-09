import Discord, { Message } from "discord.js";
import Command from "./interfaces/Command";
import CommandLoader from "./CommandLoader";
import Config from "./Config";
import MatchManager from "./matches/MatchManager";
import QueueManager from "./queues/QueueManager";
import PlayerCache from "./players/PlayerCache";
import BrawlApiWrapper from "./db/BrawlApiWrapper";

export const client = new Discord.Client();
export const command_loader = new CommandLoader();

export function main() {
	setup();
	client.once("ready", () => {
		console.log("Ready!");
		client.user?.setActivity("Brawlball");
	});
	
	client.on("message", (message: Message) => {
		command_loader.getCommandList().forEach((command: Command) => command.onMessage(message));
	});
	
	client.login(Config.DISCORD_API_TOKEN);
}

function setup() {
	MatchManager.getInstance();
	QueueManager.getInstance();
	PlayerCache.getInstance();
	BrawlApiWrapper.getInstance();
}

if (require.main === module) {
    main();
}
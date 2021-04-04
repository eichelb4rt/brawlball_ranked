import Discord, { Message } from "discord.js";
import Command from "./interfaces/Command";
import KEYS from './keys';
import CommandLoader from "./CommandLoader";
const client = new Discord.Client();
const commandLoader = new CommandLoader();

client.once("ready", () => {
	console.log("Ready!");
});

client.on("message", (message: Message) => {
	commandLoader.getCommandList().forEach((command: Command) => command.onMessage(message));
});

client.login(KEYS.botToken);
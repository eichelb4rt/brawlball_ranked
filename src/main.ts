import Discord, { Message } from "discord.js";
import Command from "./interfaces/Command";
import KEYS from './keys';
import CommandLoader from "./CommandLoader";
export const client = new Discord.Client();
export const command_loader = new CommandLoader();

client.once("ready", () => {
	console.log("Ready!");
});

client.on("message", (message: Message) => {
	command_loader.getCommandList().forEach((command: Command) => command.onMessage(message));
});

client.login(KEYS.botToken);
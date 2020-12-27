import { Message } from "discord.js"
import { Command } from "../interface/Command";

export default class Ping extends Command {
    invokeStr: string = "!ping";
    description: string = "it's the fucking ping man";
    help: string = "!ping";

    action(msg: Message): void {
        msg.channel.send("Pong.");
    }
}
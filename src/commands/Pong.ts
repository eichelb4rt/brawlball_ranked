import { Message } from "discord.js"
import { Command } from "../interface/Command";

export default class Pong extends Command {
    invokeStr: string = "!pong";
    description: string = "it's ping but cooler";
    help: string = "!pong";

    action(msg: Message): void {
        msg.channel.send("PENG");
    }
}
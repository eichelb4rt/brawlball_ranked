import { Message } from "discord.js"
import PublicCommand from "../interfaces/PublicCommand";

export default class Pong extends PublicCommand {
    invokeStr: string = "!pong";
    description: string = "it's ping but cooler";
    help: string = "!pong";

    action(msg: Message): void {
        msg.channel.send("PENG");
    }
}
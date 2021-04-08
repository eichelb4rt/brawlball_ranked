import { Message } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";

export default class Pong extends PublicCommand {
    name: string = "pong";
    short_description: string = "it's ping but cooler";
    long_description: string = "it's ping but cooler";
    usage: string = "!pong";

    action(msg: Message): void {
        msg.channel.send("PENG");
    }
}
import { Message } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";

export default class Ping extends PublicCommand {
    name: string = "ping";
    short_description: string = "it's the fucking ping man";
    long_description: string = "it's the fucking ping man";
    usage: string = "!ping";

    action(msg: Message): void {
        msg.channel.send("Pong.");
    }
}
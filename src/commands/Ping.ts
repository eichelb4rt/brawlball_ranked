import { Message } from "discord.js"
import PublicCommand from "../interfaces/PublicCommand";

export default class Ping extends PublicCommand {
    invokeStr: string = "!ping";
    description: string = "it's the fucking ping man";
    help: string = "!ping";

    action(msg: Message): void {
        msg.channel.send("Pong.");
    }
}
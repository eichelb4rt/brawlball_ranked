import { Message } from "discord.js"
import SecretCommand from "../interfaces/SecretCommand";

export default class Shutdown extends SecretCommand {
    
    name = "shutdown";

    action(msg: Message): void {
        msg.channel.send("no.")
    }
}
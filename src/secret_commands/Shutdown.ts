import { Message } from "discord.js"
import SecretCommand from "../interface/SecretCommand";

export default class Shutdown extends SecretCommand {
    
    invokeStr = "!shutdown";

    action(msg: Message): void {
        msg.channel.send("no.")
    }
}
import { Message } from "discord.js"
import SecretCommand from "../interfaces/SecretCommand";

export default class LogMessage extends SecretCommand {
    
    invokeStr = 'any';  // not actually used
    enabled = false;

    // overrides onMessage
    onMessage(msg: Message): void {
        this.action(msg);
    }

    action(msg: Message): void {    //TODO: write it to a file
        console.log(msg)
    }
}
import { Message } from "discord.js"

export abstract class Command {
    readonly enabled: boolean = true;
    abstract readonly invokeStr: string;
    
    onMessage(msg: Message): void {
        const startsWith: string = msg.content.split(" ")[0];
        if (startsWith == this.invokeStr) {
            this.action(msg);
        }
    }
    
    abstract action(msg: Message): void;
}
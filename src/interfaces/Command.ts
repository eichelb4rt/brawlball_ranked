import { Message } from "discord.js"

export default abstract class Command {
    readonly enabled: boolean = true;
    readonly prefix = '!';
    abstract readonly name: string;
    
    onMessage(msg: Message): void {
        const startsWith: string = msg.content.split(" ")[0];
        if (startsWith == this.invoke_str) {
            this.action(msg);
        }
    }
    
    abstract action(msg: Message): void;

    public get invoke_str(): string {
        return this.prefix + this.name;
    }
}
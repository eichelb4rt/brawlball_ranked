import { Command } from "./Command";

export abstract class PublicCommand extends Command {
    abstract readonly description: string;
    abstract readonly help: string;
}
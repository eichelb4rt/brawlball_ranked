import Command from "./Command";

export default abstract class PublicCommand extends Command {
    abstract readonly description: string;
    abstract readonly help: string;
}
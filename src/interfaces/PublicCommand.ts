import Command from "./Command";

export default abstract class PublicCommand extends Command {
    abstract readonly short_description: string;
    abstract readonly long_description: string;
    abstract usage: string;
}
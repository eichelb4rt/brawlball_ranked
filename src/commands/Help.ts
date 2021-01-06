import { Message, MessageEmbed } from "discord.js"
import CommandLoader from "../CommandLoader";
import Config from "../Config";
import PublicCommand from "../interfaces/PublicCommand";

export default class Help extends PublicCommand {
    invokeStr: string = "!help";
    description: string = "Help! It's a flying spaghetti monster!";
    help: string = "!help";

    action(msg: Message): void {
        const helpEmbed: MessageEmbed = new MessageEmbed();
        helpEmbed.setTitle("Commands");
        helpEmbed.setColor("#002154");
        const commands = CommandLoader.getCommandList(Config.publicCommandsDir).map(command => command as PublicCommand);
        commands.forEach(command => {
            helpEmbed.addField(command.invokeStr, `\`${command.help}\`\n${command.description}`, false);
        });
        msg.channel.send(helpEmbed);
    }
}
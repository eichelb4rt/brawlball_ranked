import { Message, MessageEmbed, TextChannel } from "discord.js"
import CommandLoader from "../../CommandLoader";
import Config from "../../Config";
import PublicCommand from "../../interfaces/PublicCommand";
import { command_loader } from "../../main";

export default class Help extends PublicCommand {
    name: string = "help";
    short_description: string = "Help! It's a flying spaghetti monster!";
    long_description: string = "Help! It's a flying spaghetti monster!";
    usage: string = "!help";

    action(msg: Message): void {
        const channel = msg.channel as TextChannel;
        const args = msg.content.split(/ +/);
        if (args.length == 1) { // only invoke string
            channel.send(this.general_help_embed());
        } else if (args.length == 2) {
            try {
                channel.send(this.man_page(args[1]));
            } catch (e) {
                channel.send(e.message);
            }
        } else {
            channel.send("You can only get help for 1 command.");
        }
    }

    general_help_embed(): MessageEmbed {
        const helpEmbed: MessageEmbed = new MessageEmbed()
            .setTitle("Commands")
            .setColor(Config.embed_colour)
            .addField("Usage:", "Type `!help <command_name>` to show more detailed command usage.\n(e.g.: `!help kick`)", true);
        const categories = command_loader.getCategories();
        for (let category of categories) {
            let category_string = "";
            for (let command of category.commands) {
                category_string = category_string.concat(`\`${command.name}\`: _${command.short_description}_\n`);
            }
            helpEmbed.addField(category.name, category_string, false);
        }
        return helpEmbed;
    }

    man_page(command_str: string): MessageEmbed {
        // find command
        const commands = CommandLoader.getCommandList(Config.publicCommandsDir).map(command => command as PublicCommand);
        let command: PublicCommand | undefined = undefined;
        for (let command_in_list of commands) {
            if (command_in_list.name === command_str) {
                command = command_in_list;
            }
        }
        
        // if there is not a command with the specified invoke str, say it and shout it out loud and scream it
        if (!command) {
            throw new Error(`There is no command called \`${command_str}\`.`);
        }

        // create the man page
        const helpEmbed: MessageEmbed = new MessageEmbed()
            .setTitle("Command Help")
            .setColor(Config.embed_colour)
            .setDescription(`Help page for \`${command.name}\``)
            .addField("Description", command.long_description, false)
            .addField("Usage", command.usage, false);
        return helpEmbed;
    }
}
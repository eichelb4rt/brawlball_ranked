import { Message, MessageReaction, TextChannel, User } from "discord.js"
import DBManager from "../../db/DBManager";
import PublicCommand from "../../interfaces/PublicCommand";
import PlayerCache from "../../players/PlayerCache";
import Config from "../../Config";
import Role from "../../players/Role";
import ArgumentParser from "../../ui/ArgumentParser";

export default class Link extends PublicCommand {
    readonly time_unti_message_deleted = 5 * 1000;

    name: string = "roles";
    short_description: string = "Set your Brawlball roles (run, defend, support).";
    long_description: string = `Set your Brawlball roles (run, defend, support). You've got ${this.time_unti_message_deleted}s time to set (react) your roles after the command has been sent. Alternatively, you can give your preferred roles a parameters to the command.`;
    
    private arg_parser: ArgumentParser;
    constructor() {
        super();
        this.arg_parser = new ArgumentParser(this.invoke_str);
        this.arg_parser.add_argument({
            name: "Role1",
            dest: "role_1",
            help: "(run/def/sup)",
            optional: true
        });
        this.arg_parser.add_argument({
            name: "Role2",
            dest: "role_2",
            help: "(run/def/sup)",
            optional: true
        });
        this.arg_parser.add_argument({
            name: "Role2",
            dest: "role_2",
            help: "(run/def/sup)",
            optional: true
        });
    }

    public get usage(): string {
        return this.arg_parser.usage;
    }

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;

        // get the brawl id corresponding to the discord id
        const db_manager = DBManager.getInstance();
        let brawl_id: string
        try {
            brawl_id = await db_manager.discord_id_to_brawl_id(msg.author.id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // get the roles they want to have
        let chosen_roles: Role[];
        try {
            chosen_roles = await this.get_roles(msg);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // get the player with the brawl id
        const player_cache = PlayerCache.getInstance();
        const player = player_cache.getPlayer(brawl_id);
        if (chosen_roles.length === 0) {
            channel.send("You have not chosen new roles.");
            return;
        }
        await player.setup();
        player.roles = chosen_roles;

        // confirm that they set the roles they wanted to set
        let roles_str = "";
        for (let role of chosen_roles) {
            roles_str = roles_str.concat(`${role.display_name} `);
        }
        channel.send(`<@${msg.author.id}> you have chosen these roles: ${roles_str}`);

    }

    private async get_roles(msg: Message): Promise<Role[]> {
        let chosen_roles: Role[] = [];

        // first check if roles are given as arguments

        const args = msg.content.split(/ +/).slice(1).map(str => str.toLowerCase());
        if (args.length > 0) {
            // check if there are args that do no resemble roles
            for (const arg of args) {
                const role = this.get_role_by_arg(arg);
                if (!role) {
                    throw new Error(`The role \`${arg}\` does not exist.`);
                }
                chosen_roles.push(role);
            }
            return chosen_roles;
        }

        // react to the message, offering option win and loss
        const choices = Config.roles.map(role => role.emoji);
        for (let choice of choices) {
            await msg.react(choice);
        }

        const filter = (reaction: MessageReaction, user: User) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        const collection = await msg.awaitReactions(filter, { max: choices.length, dispose: true, time: this.time_unti_message_deleted });
        const reaction_emojis = collection.map(reaction => reaction.emoji.name);
        for (const reaction_emoji of reaction_emojis) {
            chosen_roles.push(this.get_role_by_emoji(reaction_emoji)!);
        }

        // role selection ended
        msg.delete({reason: "Role selection ended."});
        return chosen_roles;
    }

    private get_role_by_arg(arg: string): Role | undefined {
        for (const role of Config.roles) {
            const acceptable_names = role.acceptable_names.map(str => str.toLowerCase());
            if (acceptable_names.includes(arg.toLowerCase())) {
                return role;
            }
        }
        return undefined;
    }

    private get_role_by_emoji(emoji: string): Role | undefined {
        for (const role of Config.roles) {
            if (role.emoji === emoji) {
                return role;
            }
        }
        return undefined;
    }
}
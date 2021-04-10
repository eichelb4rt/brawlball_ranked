import { Message, MessageEmbed, MessageReaction, Role, TextChannel, User } from "discord.js"
import DBManager from "../../db/DBManager";
import PublicCommand from "../../interfaces/PublicCommand";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";
import PlayerCache from "../../players/PlayerCache";
import Elo, { Score } from "../../matches/Elo";
import Match, { Teams } from "../../matches/Match";
import Player, { Roles } from "../../players/Player";
import Config from "../../Config";

export default class Link extends PublicCommand {
    readonly time_unti_message_deleted = 5 * 1000;

    name: string = "roles";
    short_description: string = "Set your Brawlball roles (run, defend, support).";
    long_description: string = `Set your Brawlball roles (run, defend, support). You've got ${this.time_unti_message_deleted}s time to set (react) your roles after the command has been sent. Alternatively, you can give your preferred roles a parameters to the command.`;
    usage: string = "!roles";

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
        let chosen_roles: Roles[];
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
            roles_str = roles_str.concat(`${role} `);
        }
        channel.send(`You have chosen these roles: ${roles_str}`);

    }

    private async get_roles(msg: Message): Promise<Roles[]> {
        let chosen_roles: Roles[] = [];

        // first check if roles are given as arguments
        const roles_to_strings: Map<Roles, string[]> = new Map([
            [Roles.Runner, ['R', 'Run', 'Runner']],
            [Roles.Support, ['S', 'Sup', 'Support', 'Supporter']],
            [Roles.Defense, ['D', 'Def', 'Defense', 'Defence', 'defend']]
        ]);

        const args = msg.content.split(/ +/).slice(1).map(str => str.toLowerCase());
        if (args.length > 0) {
            // check if there are args that do no resemble roles
            let possible_role_strs: string[] = [];
            for (const str_array of roles_to_strings.values()) {
                possible_role_strs = possible_role_strs.concat(str_array.map(str => str.toLowerCase()));
            }
            for (const arg of args) {
                if (!possible_role_strs.includes(arg)) {
                    throw new Error(`There is no role called \`${arg}\``);
                }
            }

            // now search in the args for roles
            for (const role of roles_to_strings.keys()) {
                const role_strs = roles_to_strings.get(role);
                for (const role_str of role_strs!.map(str => str.toLowerCase())) {
                    if (args.includes(role_str)) {
                        chosen_roles.push(role);
                        break;  // we found the role, we will break
                    }
                }
            }
            return chosen_roles;
        }

        // react to the message, offering option win and loss
        const run_emoji = '🏃';
        const sup_emoji = '⚔️';
        const def_emoji = '🛡️';
        const choices = [run_emoji, sup_emoji, def_emoji];
        for (let choice of choices) {
            await msg.react(choice);
        }

        const emoji_to_role: Map<string, Roles> = new Map([
            [run_emoji, Roles.Runner],
            [sup_emoji, Roles.Support],
            [def_emoji, Roles.Defense]
        ]);

        const filter = (reaction: MessageReaction, user: User) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        const collection = await msg.awaitReactions(filter, { max: choices.length, dispose: true, time: this.time_unti_message_deleted });
        const reaction_emojis = collection.map(reaction => reaction.emoji.name);
        for (const reaction_emoji of reaction_emojis) {
            chosen_roles.push(emoji_to_role.get(reaction_emoji)!);
        }

        // role selection ended
        msg.delete({reason: "Role selection ended."});
        return chosen_roles;
    }
}
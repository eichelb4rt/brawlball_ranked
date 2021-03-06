import { Message, MessageEmbed, TextChannel, User } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";
import Config from "../../Config";
import ArgumentParser from "../../ui/ArgumentParser";

export default class Info extends PublicCommand {
    name: string = "rank";
    short_description: string = "Get some ranked info.";
    long_description: string = "Shows: brawlhalla name, discord name, rank, preferred role.\nMention a player to get their info. If no player is given, it will show info about you.";

    private arg_parser: ArgumentParser;
    constructor() {
        super();
        this.arg_parser = new ArgumentParser(this.invoke_str);
        this.arg_parser.add_argument({
            name: "@mention",
            dest: "mention",
            help: "Mention a Discord user to get their info.",
            optional: true
        });
    }

    public get usage(): string {
        return this.arg_parser.usage;
    }

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;

        // get player that info is shown for
        const user = this.get_player(msg);

        // get discord name
        const discord_name = user.username;

        // get the brawl id corresponding to the discord id
        const db_manager = DBManager.getInstance();
        let brawl_id: string
        try {
            brawl_id = await db_manager.discord_id_to_brawl_id(user.id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // get player name
        const brawl_api_wrapper = BrawlApiWrapper.getInstance();
        const brawl_name = await brawl_api_wrapper.getNameByID(brawl_id);

        // get the player
        const player_cache = PlayerCache.getInstance();
        const player = await player_cache.getPlayer(brawl_id);

        // get the role
        let roles_str = "";
        for (let role of player.roles) {
            roles_str = roles_str.concat(`${role.display_name} ${role.emoji}\n`);
        }
        if (player.roles.length === 0) {
            roles_str = "none";
        }

        // start building embed
        const embed: MessageEmbed = new MessageEmbed()
            .setTitle("Player Info")
            .setColor(Config.embed_colour)
            .addField("Brawlhalla Name", brawl_name, true)
            .addField("Discord Name", discord_name, true)
            .addField('Preferred Roles', roles_str, true);
        
        // add the ranks where the player is actually ranked in
        let has_rank: boolean = false;  // determine if the player is actually ranked in anywhere
        const pools = player.elo_map.keys();
        for (let blueprint of pools) {
            const elo = player.getEloInQueue(blueprint);
            const rank = player.getRank(blueprint);
            if (elo != Config.eloOnStart) {
                has_rank = true;
                embed.addField(blueprint.displayName, `${elo} (${rank})`, true);
            }
        }
        // say that they're not ranked in if there aren't any
        if (!has_rank) {
            embed.addField('Rank', 'You have not played ranked yet.', true);
        }
        channel.send(embed);
    }

    private get_player(msg: Message): User {
        // get the mentioned discord id
        const mentioned_users: User[] = msg.mentions.users.map(user => user);   // we only want users, not weird string
        if (mentioned_users[0]) {
            return mentioned_users[0];
        }

        // if no one was mentioned and no name was given, take the author
        return msg.author;
    }
}


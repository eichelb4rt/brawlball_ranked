import { Message, MessageEmbed, MessageReaction, TextChannel, User } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import QueueManager from "../../queues/QueueManager";
import Team from "../../players/Team";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";
import Config from "../../Config";

export default class Info extends PublicCommand {
    name: string = "info";
    short_description: string = "Get some ranked info.";
    long_description: string = "Shows: brawlhalla name, discord name, rank, preferred role.\nMention a player to get their info. If no player is given, it will show info about you.";
    usage: string = "!info [<mention/brawlhalla_name>]";

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
        const player = player_cache.getPlayer(brawl_id);

        // get the role
        const role = 'not implemented yet';

        // start building embed
        const embed: MessageEmbed = new MessageEmbed()
            .setTitle("Player Info")
            .setColor(Config.embed_colour)
            .addField("Brawlhalla Name", brawl_name, true)
            .addField("Discord Name", discord_name, true)
            .addField('Preferred Role', role, true);
        
        // add the ranks
        for (let blueprint of player.elo_map.keys()) {
            embed.addField(blueprint.displayName, `${player.getEloInQueue(blueprint)} (${player.getRank(blueprint)})`);
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


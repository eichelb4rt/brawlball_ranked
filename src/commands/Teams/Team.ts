import { Message, MessageEmbed, MessageReaction, TextChannel, User } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import QueueManager from "../../queues/QueueManager";
import Team from "../../players/Team";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";

export default class TeamCommand extends PublicCommand {
    name: string = "team";
    short_description: string = "Show the players in your team.";
    long_description: string = "Show the players in your team. The host is underlined and thicc.";
    usage: string = "!team";

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;
        // get the brawl id corresponding to the (inviting player) discord id
        const db_manager = DBManager.getInstance();
        let brawl_id: string
        try {
            brawl_id = await db_manager.discord_id_to_brawl_id(msg.author.id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // get the player
        const player_cache = PlayerCache.getInstance();
        let player = player_cache.getPlayer(brawl_id);
        let team = player.team;

        // build the string holding the team members
        let team_string = "";
        if (!team) {
            team_string = await BrawlApiWrapper.getNameByID(player.id);
        } else {
            for (let team_player of team.players) {
                // append the name to the string
                let name = await BrawlApiWrapper.getNameByID(team_player.id);
                if (team_player == team.host)    // underline host
                    name = `__**${name}**__`;
                team_string = team_string.concat(`${name}\n`);
            }
        }

        // build the message that shows the team members
        const team_embed: MessageEmbed = new MessageEmbed()
            .setTitle("Team Info")
            .setColor("#002154")
            .addField("players", team_string, false);
        channel.send(team_embed);
    }
}


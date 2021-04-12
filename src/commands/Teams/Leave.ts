import { Message, TextChannel } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";

export default class Leave extends PublicCommand {
    name: string = "leave";
    short_description: string = "Leave your team.";
    long_description: string = "Leave your team";
    usage: string = "!leave";

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

        // get player and team
        const player_cache = PlayerCache.getInstance();
        let player = player_cache.getPlayer(brawl_id);
        let team = player.team;

        // correct usage
        if (!team) {
            channel.send("You're not even in a team.");
            return;
        }

        team.kick(player);
        channel.send("You left your team.");
    }
}


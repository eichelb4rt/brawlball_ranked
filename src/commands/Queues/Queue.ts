import { Message, TextChannel } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import QueueManager from "../../queues/QueueManager";

export default class QueueCommand extends PublicCommand {
    name: string = "queue";
    short_description: string = "Join the queue for matchmaking.";
    long_description: string = "Join the queue for matchmaking. Has to be done in one of the queue channels.";
    usage: string = "!queue";
    category_name: string = "Queues";

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;
        let parent_category = channel.parent;
        // check if the channel even has a category
        // and if it has one, that it is the right one
        if (!parent_category || parent_category.name.toLowerCase() != this.category_name.toLowerCase()) {
            channel.send("This is not a queue channel.");
            return;
        }

        let args = channel.name.split("_");

        // example: eur_team_3v3
        let region = args[0].toUpperCase();
        let pool = args[1] + args[2];

        // get the brawl id corresponding to the discord id
        const db_manager = DBManager.getInstance();
        let brawl_id: string
        try {
            brawl_id = await db_manager.discord_id_to_brawl_id(msg.author.id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // let the queuemanager handle the rest
        try {
            await this.queue(brawl_id, pool, region);
            channel.send("Searching for players...");
        } catch (e) {
            channel.send(e.message);
            return;
        }
    }

    async queue(brawlId: string, pool: string, region: string) {
        const playerCache = PlayerCache.getInstance();
        const queueManager = QueueManager.getInstance();
        const player = playerCache.getPlayer(brawlId);
        if (player.team) {
            if (player.team.host == player) {
                return await queueManager.addToQueue(pool, region, player.team);
            } else {
                throw new Error("Only the host can join a queue.");
            }
        } else {
            return await queueManager.addToSoloQueue(pool, region, player);
        }
    }
}


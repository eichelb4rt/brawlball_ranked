import { Message, TextChannel } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import QueueManager from "../../queues/QueueManager";
import Config from "../../Config";
import QueueBlueprint from "../../queues/QueueBlueprint";

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

        // get the queue that they want to queue in by channel name
        // example: eur_team_3v3 (region_display_name)
        const args = channel.name.split("_");
        if (args.length < 2) {
            channel.send("Channel has invalid format for queueing.");
            return;
        }

        // region is the first argument
        let region = args[0].toUpperCase();
        if (!Config.regions.includes(region)) {
            channel.send(`Region \`${region}\` not found.`);
            return;
        }

        // everything after is the display name with underlines for whitespace
        let pool_display_name = args.slice(1).join(" ");
        let pool_db_name: string;
        try {
            pool_db_name = this.find_pool(pool_display_name)?.dbname;
        } catch (e) {
            channel.send(e.message);
            return;
        }

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
            await this.queue(brawl_id, pool_db_name, region);
            channel.send("Searching for players...");
        } catch (e) {
            channel.send(e.message);
            return;
        }
    }

    private async queue(brawlId: string, pool: string, region: string) {
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

    private find_pool(display_name: string): QueueBlueprint {
        for (const blueprint of Config.queues) {
            if (blueprint.displayName.toLowerCase() === display_name.toLowerCase()) {
                return blueprint
            }
        }
        throw new Error(`Pool \`${display_name}\` not found.`);
    }
}


import { Message, TextChannel } from "discord.js"
import PublicCommand from "../interfaces/PublicCommand";
import DBManager from "../db/DBManager";
import PlayerCache from "../players/PlayerCache";
import QueueManager from "../queues/QueueManager";

export default class Abort extends PublicCommand {
    invokeStr: string = "!abort";
    description: string = "Abort your queue.";
    help: string = "!abort";

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;

        // get the brawl id corresponding to the discord id
        const db = await DBManager.getInstance().db;
        const brawlId = (await db.get("SELECT * FROM Users WHERE DiscordID = ?", [msg.author.id]))!.BrawlhallaID;

        if (!brawlId) {
            channel.send("You don't have a Brawlhalla Account linked. To do that, type `!link \{your Brawlhalla ID\}`");
            return;
        }

        try {
            await this.abort(brawlId);
            channel.send("You are no longer in the queue.");
        } catch (e) {
            channel.send(e.message);
        }
    }

    async abort(brawlId: string) {
        const playerCache = PlayerCache.getInstance();
        const queueManager = QueueManager.getInstance();
        const player = playerCache.getPlayer(brawlId);
        console.log(playerCache);
        if (player.team) {
            return queueManager.abortQueue(player.team);
        } else {
            return queueManager.abortSoloQueue(player);
        }
    }
}


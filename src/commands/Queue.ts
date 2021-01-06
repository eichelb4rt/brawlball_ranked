import { Message } from "discord.js"
import Player from "../elo/Player";
import PublicCommand from "../interfaces/PublicCommand";
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export default class Queue extends PublicCommand {
    invokeStr: string = "!queue";
    description: string = "queue in a region.";
    help: string = "!queue (details not worked out yet)";

    action(msg: Message): void {
        msg.channel.send("Pong.");
    }

    queue(DiscordID: string, queue: string, region: string) {
        
        open({
            filename: "../../elo.db",
            driver: sqlite3.cached.Database,
            mode: sqlite3.OPEN_READWRITE
        }).then((db) => {
            let BrawlID = db.get("SELECT BrawlhallaID FROM Users WHERE DiscordID = ?", DiscordID);
            let name = "TODO";  // get the Brawlhalla name

        });
    }
}
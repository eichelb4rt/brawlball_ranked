import { Message } from "discord.js"
import DBManager from "../db/DBManager";
import PublicCommand from "../interfaces/PublicCommand";
import BrawlApiWrapper from "../db/BrawlApiWrapper";

export default class Link extends PublicCommand {
    invokeStr: string = "!link";
    description: string = "lets me know what your brawlhalla account is";
    help: string = "!link \{your Brawlhalla ID\}";

    async action(msg: Message): Promise<void> {
        const brawl_id: string = msg.content.split(/ +/)[1];    // separate by whitespace and take 2nd argument

        const db = await DBManager.getInstance().db;
        
        // check if the given id even belongs to a user
        let name: string;
        try {
            name = await BrawlApiWrapper.getNameByID(brawl_id);
        } catch (e) {
            msg.channel.send("This id does not belong to any Brawlhalla User.");
            return;
        }

        // check if the brawlhalla id was already given away
        let found_account = await db.get("SELECT * FROM Users WHERE BrawlhallaID = ?", [brawl_id]);
        if (found_account) {
            msg.channel.send(`This id already belongs to <@${found_account.DiscordID}>.`);
            return;
        }

        // check if the discord ujser already has a brawl account linked
        if (await db.get("SELECT * FROM Users WHERE DiscordID = ?", [msg.author.id])) {
            db.run("UPDATE Users SET BrawlID = ? WHERE DiscordID = ?", [brawl_id, msg.author.id]);
            msg.channel.send(`You successfully updated your Brawlhalla id, ${name}`);
        } else {
            db.run("INSERT INTO Users VALUES(?, ?)", [msg.author.id, brawl_id]);
            msg.channel.send(`You were successfully registered, ${name}.`);
        }
    }
}
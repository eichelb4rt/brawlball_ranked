import { Message, TextChannel } from "discord.js"
import DBManager from "../../db/DBManager";
import PublicCommand from "../../interfaces/PublicCommand";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";

export default class Link extends PublicCommand {
    name: string = "link";
    short_description: string = "Link your Brawlhalla account to queue in ranked matches.";
    long_description: string = "Link your Brawlhalla account to queue in ranked matches. You can find your Brawlhalla ID when you start up Brawlhalla and look into your inventory.";
    usage: string = "!link <your_brawlhalla_id>";

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;
        const args = msg.content.split(/ +/);
        if (args.length < 2) {
            channel.send("Please provide your Brawlhalla ID.");
            return;
        }
        const brawl_id: string = msg.content.split(/ +/)[1];    // separate by whitespace and take 2nd argument

        const db = await DBManager.getInstance().db;
        
        // check if the given id even belongs to a user
        const brawl_api_wrapper = BrawlApiWrapper.getInstance();
        let name: string;
        try {
            name = await brawl_api_wrapper.getNameByID(brawl_id);
        } catch (e) {
            channel.send("This id does not belong to any Brawlhalla User.");
            return;
        }

        // check if the brawlhalla id was already given away
        let found_account = await db.get("SELECT * FROM Users WHERE BrawlhallaID = ?", [brawl_id]);
        if (found_account) {
            channel.send(`This id already belongs to <@${found_account.DiscordID}>.`);
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
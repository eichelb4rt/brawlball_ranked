import { Message, TextChannel } from "discord.js"
import DBManager from "../../db/DBManager";
import PublicCommand from "../../interfaces/PublicCommand";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";
import ArgumentParser, { Arguments } from "../../ui/ArgumentParser";

export default class Link extends PublicCommand {
    name: string = "link";
    short_description: string = "Link your Brawlhalla account to queue in ranked matches.";
    long_description: string = "Link your Brawlhalla account to queue in ranked matches. You can find your Brawlhalla ID when you start up Brawlhalla and look into your inventory.";
    
    private arg_parser: ArgumentParser;
    constructor() {
        super();
        this.arg_parser = new ArgumentParser(this.invoke_str);
        this.arg_parser.add_argument({
            name: "BrawlhallaID",
            dest: "brawl_id",
            help: "Your Brawlhalla ID."
        });
    }

    public get usage(): string {
        return this.arg_parser.usage;
    }

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;
        let args: Arguments;
        try {
            args = this.arg_parser.parse_arguments(msg.content);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        const db = await DBManager.getInstance().db;
        
        // check if the given id even belongs to a user
        const brawl_api_wrapper = BrawlApiWrapper.getInstance();
        let name: string;
        try {
            name = await brawl_api_wrapper.getNameByID(args.brawl_id);
        } catch (e) {
            channel.send("This id does not belong to any Brawlhalla User.");
            return;
        }

        // check if the brawlhalla id was already given away
        let found_account = await db.get("SELECT * FROM Users WHERE BrawlhallaID = ?", [args.brawl_id]);
        if (found_account) {
            channel.send(`This id already belongs to <@${found_account.DiscordID}>.`);
            return;
        }

        // check if the discord ujser already has a brawl account linked
        if (await db.get("SELECT * FROM Users WHERE DiscordID = ?", [msg.author.id])) {
            db.run("UPDATE Users SET BrawlID = ? WHERE DiscordID = ?", [args.brawl_id, msg.author.id]);
            msg.channel.send(`You successfully updated your Brawlhalla id, ${name}`);
        } else {
            db.run("INSERT INTO Users VALUES(?, ?)", [msg.author.id, args.brawl_id]);
            msg.channel.send(`You were successfully registered, ${name}.`);
        }
    }
}
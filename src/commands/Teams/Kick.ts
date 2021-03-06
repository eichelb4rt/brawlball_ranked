import { Message, TextChannel } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import ArgumentParser from "../../ui/ArgumentParser";

export default class Kick extends PublicCommand {
    name: string = "kick";
    short_description: string = "Kick players from your team.";
    long_description: string = "Kick player from your team. Only the host can kick people.";

    private arg_parser: ArgumentParser;
    constructor() {
        super();
        this.arg_parser = new ArgumentParser(this.invoke_str);
        this.arg_parser.add_argument({
            name: "@mention",
            dest: "mention",
            help: "Mention a Discord user to kick them from your team.",
            optional: true
        });
    }

    public get usage(): string {
        return this.arg_parser.usage;
    }

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;

        // get the (kicked player) discord id
        const mentioned_users: string[] = msg.mentions.users.map(user => user.id);
        const kicked_discord_id: string = mentioned_users[0];
        // get the brawl id corresponding to the (kicking player) discord id
        const db_manager = DBManager.getInstance();
        let kicking_brawl_id: string
        try {
            kicking_brawl_id = await db_manager.discord_id_to_brawl_id(msg.author.id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // check for correct usage
        if (mentioned_users.length == 0) {
            channel.send("You have to kick a specific player.");
            return;
        } else if (mentioned_users.length > 1) {
            channel.send("You can't kick more than 1 player at the same time.");
            return;
        } else if (msg.author.id == kicked_discord_id) {
            channel.send("You can't kick yourself. `!leave` might be what you want.");
            return;
        }

        // try getting brawl id
        let kicked_brawl_id: string;
        try {
            kicked_brawl_id = await db_manager.discord_id_to_brawl_id(kicked_discord_id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // try to kick the guy
        try {
            await this.kick(kicking_brawl_id, kicked_brawl_id);
            channel.send(`<@${kicked_discord_id}> was kicked from your team.`);
        } catch (e) {
            channel.send(e.message);
        }
    }

    async kick(kicking_id: string, kicked_id: string) {
        // get players
        const player_cache = PlayerCache.getInstance();
        let kicking_player = await player_cache.getPlayer(kicking_id);
        let kicked_player = await player_cache.getPlayer(kicked_id);

        // check if the player can even be kicked and permissions and stuff
        let team = kicking_player.team;
        if (!team) {
            throw new Error("You are not even in a team.");
        } else if (team.host != kicking_player) {
            throw new Error("Only the host can kick players.");
        }

        // check if the player is even in the team
        if (team.players.includes(kicked_player)) {
            team.kick(kicked_player);
        } else {
            throw new Error("This player is not even in your team.");
        }
    }
}


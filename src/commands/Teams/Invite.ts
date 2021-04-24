import { Message, MessageReaction, TextChannel, User } from "discord.js"
import PublicCommand from "../../interfaces/PublicCommand";
import DBManager from "../../db/DBManager";
import PlayerCache from "../../players/PlayerCache";
import Team from "../../players/Team";
import ArgumentParser from "../../ui/ArgumentParser";

export default class Invite extends PublicCommand {
    readonly time_until_expired = 5 * 60 * 1000;
    name: string = "invite";
    short_description: string = "Invite players to your team.";
    long_description: string = `Invite players to your team. Invitation expires after ${(this.time_until_expired / (60 * 1000)).toFixed(2)} minutes`;

    private arg_parser: ArgumentParser;
    constructor() {
        super();
        this.arg_parser = new ArgumentParser(this.invoke_str);
        this.arg_parser.add_argument({
            name: "@mention",
            dest: "mention",
            help: "Mention a Discord user to invite them to your team.",
            optional: true
        });
    }

    public get usage(): string {
        return this.arg_parser.usage;
    }

    async action(msg: Message): Promise<void> {
        const channel = msg.channel as TextChannel;

        // get the (invited player) discord id
        const mentioned_users: string[] = msg.mentions.users.map(user => user.id);
        const invited_discord_id: string = mentioned_users[0];
        // get the brawl id corresponding to the (inviting player) discord id
        const db_manager = DBManager.getInstance();
        let inviting_brawl_id: string
        try {
            inviting_brawl_id = await db_manager.discord_id_to_brawl_id(msg.author.id);
        } catch (e) {
            channel.send(e.message);
            return;
        }

        // check for correct usage
        if (mentioned_users.length == 0) {
            channel.send("You have to invite a specific player.");
            return;
        } else if (mentioned_users.length > 1) {
            channel.send("You can't invite more than 1 player.");
            return;
        } else if (msg.author.id == invited_discord_id) {
            channel.send("You can't invite yourself.");
            return;
        }

        // react the choices
        const accept_emoji = "✅";
        const decline_emoji = "🚫";
        await msg.react(accept_emoji);
        await msg.react(decline_emoji);

        // filter for reactions (we only want to listen for reactions from the invited player that are accepting or declining the invitation)
        const filter = (reaction: MessageReaction, user: User) => {
            return [accept_emoji, decline_emoji].includes(reaction.emoji.name) && user.id == invited_discord_id;
        };
        
        // listen for reactions
        let collection = await msg.awaitReactions(filter, { max: 1, dispose: true, time: this.time_until_expired });
        let first_reaction = collection.first();

        // now check if invited player even has a Brawlhalla account linked
        let invited_brawl_id: string;
        try {
            invited_brawl_id = await db_manager.discord_id_to_brawl_id(invited_discord_id);
        } catch (e) {
            channel.send(e.message);
            return;
        } finally {
            // whatever happens, we don't need the invitation message anymore
            msg.delete({reason: "Invitation no longer needed."});
        }

        // process reaction
        if (first_reaction?.emoji.name == accept_emoji) {   // if the invitation was accepted
            try {
                await this.accept_invitation(inviting_brawl_id, invited_brawl_id);
                channel.send("Invitation accepted.");
            } catch (e) {
                channel.send(e.message);
            }
        } else if (first_reaction?.emoji.name == decline_emoji) {    // if the invitation was declined
            channel.send("Invitation declined.");
        } else {    // listener did not find reactions in the given time (time_until_expired)
            channel.send("Invitation expired.");
        }
    }

    async accept_invitation(inviting_id: string, invited_id: string) {
        // get players
        const player_cache = PlayerCache.getInstance();
        let inviting_player = await player_cache.getPlayer(inviting_id);
        let invited_player = await player_cache.getPlayer(invited_id);

        // if the inviting player was not in a team before, create one
        let team = inviting_player.team;
        if (!team) {
            team = new Team(inviting_player);
        }

        // let the invited player join the inviting player's team
        return team.join(invited_player);
    }
}


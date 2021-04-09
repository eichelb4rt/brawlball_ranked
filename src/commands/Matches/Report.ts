import { Message, MessageEmbed, MessageReaction, TextChannel, User } from "discord.js"
import DBManager from "../../db/DBManager";
import PublicCommand from "../../interfaces/PublicCommand";
import BrawlApiWrapper from "../../db/BrawlApiWrapper";
import PlayerCache from "../../players/PlayerCache";
import Elo, { Score } from "../../matches/Elo";
import Match, { Teams } from "../../matches/Match";

export default class Link extends PublicCommand {
    readonly time_until_WL_expires = 5 * 60 * 1000; // first reaction: W or L
    readonly time_until_auto_confirm = 10 * 60 * 1000;  // enemies confirmation of W or L

    name: string = "report";
    short_description: string = "Report the result of your ranked match.";
    long_description: string = `Report whether your **W**on or **L**ost your ranked match. The result can also be a **tie**. A player of the enemy team has to confirm the result. It will automatically be confirmed after ${this.time_until_auto_confirm / (60 * 1000)} minutes.`;
    usage: string = "!report";

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

        // get the player with the brawl id
        const player_cache = PlayerCache.getInstance();
        const player = player_cache.getPlayer(brawl_id);

        // make sure the match being reported actually exists
        const match = player.match;
        if (!match) {
            channel.send("You're not even in a match.");
            return;
        }

        // react to the message, offering option win and loss
        const win_emoji = '🇼';
        const tie_emoji = '👔';
        const loss_emoji = '🇱';
        let choices = [win_emoji, tie_emoji, loss_emoji];
        for (let choice of choices) {
            await msg.react(choice);
        }

        // filter for reactions (we only want to listen for reactions from the invited player that are accepting or declining the invitation)
        const filter = (reaction: MessageReaction, user: User) => {
            return choices.includes(reaction.emoji.name) && user.id == msg.author.id;
        };
        
        // listen for reactions
        let collection = await msg.awaitReactions(filter, { max: 1, dispose: true, time: this.time_until_WL_expires });
        let first_reaction = collection.first();

        // whatever happens, we don't need the invitation message anymore
        msg.delete({reason: "Report message no longer needed."});

        // process reaction
        let score: Score;
        if (first_reaction?.emoji.name == win_emoji) {   // user reported dub
            score = Score.Win;
        } else if (first_reaction?.emoji.name == tie_emoji) {   // user reported tie
            score = Score.Draw;
        } else if (first_reaction?.emoji.name == loss_emoji) {    // loser reported loss
            score = Score.Loss;
        } else {    // listener did not find reactions in the given time (time_until_WL_expires)
            channel.send("Your time to report the match expired.");
            return;
        }

        // find out who won
        const winner: Teams = match.scoreToWinner(player, score);
        console.log(`Score: ${score}`);
        console.log(`Winner: ${winner}`);

        // build the confirming embed
        const embed: MessageEmbed = new MessageEmbed()
            .setTitle("Match Results")
            .setColor("#002154");
        
        // add results of TeamA and TeamB
        const brawl_api_wrapper = BrawlApiWrapper.getInstance();
        // Team A
        const score_a: string = Elo.score_string(Match.teamToScore(Teams.TeamA, winner));
        console.log(`Score A: ${Match.teamToScore(Teams.TeamA, winner)}`);
        console.log(`Score A: ${score_a}`);
        let players_a: string = "";
        for (let team_player of match.teamA.players) {
            // append the name to the string
            let name = await brawl_api_wrapper.getNameByID(team_player.id);
            players_a = players_a.concat(`${name}\n`);
        }
        embed.addField(`Team 1 (${score_a})`, players_a, false);

        // Team B
        const score_b: string = Elo.score_string(Match.teamToScore(Teams.TeamB, winner));
        console.log(`Score B: ${Match.teamToScore(Teams.TeamB, winner)}`);
        console.log(`Score B: ${score_b}`);
        let players_b: string = "";
        for (let team_player of match.teamB.players) {
            // append the name to the string
            let name = await brawl_api_wrapper.getNameByID(team_player.id);
            players_b = players_b.concat(`${name}\n`);
        }
        embed.addField(`Team 2 (${score_b})`, players_b, false);

        // send the embed
        const result_msg = await channel.send(embed);
    }
}
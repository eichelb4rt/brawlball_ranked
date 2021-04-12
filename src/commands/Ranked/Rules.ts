import { Message, MessageEmbed, TextChannel } from "discord.js"
import moment from "moment";
import Config from "../../Config";
import PublicCommand from "../../interfaces/PublicCommand";

export default class Help extends PublicCommand {
    name: string = "rules";
    short_description: string = "Brawlball Ranked lobby rules.";
    long_description: string = "Displays rules for a brawlball ranked lobby.";
    usage: string = "!rules";

    readonly team_dmg: boolean = false;
    readonly match_time: number = 15 * 60 * 1000;
    readonly round_time: number = 30 * 1000;
    readonly score_to_win: number = 5;
    readonly damage: number = 1;
    readonly test_features: boolean = false;

    action(msg: Message): void {
        const channel = msg.channel as TextChannel;
        const embed: MessageEmbed = new MessageEmbed()
            .setTitle("Rules")
            .setDescription("for a brawlball ranked lobby")
            .setColor(Config.embed_colour)
            .addField("Match Time", `${moment.duration(this.match_time, "ms").asMinutes()} min`, true)
            .addField("Round Time", `${moment.duration(this.round_time, "ms").asSeconds()} s`, true)
            .addField("Score to Win", this.score_to_win, false)
            .addField("Team Damage", this.team_dmg ? "on" : "off", true)
            .addField("Test Features", this.test_features ? "on" : "off", true)
            .addField("Damage", `${this.damage * 100}%`, true)
            .addField("Map", `(Big?) Brawlball Stadium`, false)
            .addField("Disconnects", `If anyone disconnects at the __start of the match__, everyone has to wait. Do *not* touch the ball so it can reset properly and respawns in the middle. If anyone disconnects in the __middle of a match__, an attack can be continued. The attack ends if the enemy gains ball control.`, false);
        channel.send(embed);
    }
}
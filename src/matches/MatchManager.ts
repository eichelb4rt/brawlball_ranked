import QueueManager from "../queues/QueueManager";
import { Score } from "./Elo";
import { QueuedMatch } from "./Match";
import Player from "../players/Player";
import { MessageEmbed } from "discord.js";
import Config from "../Config";
import BrawlApiWrapper from "../db/BrawlApiWrapper";

export default class MatchManager {
    // manages matches and reports results to db
    private static instance: MatchManager;

    private constructor() {
        const queueManager: QueueManager = QueueManager.getInstance();
        queueManager.onMatchFound.subscribe(async (queuedMatch) => {
            this.startMatch(queuedMatch);   // start the match
            // send a dm to the players that the match was found
            const match_embed = await this.player_dm(queuedMatch);
            for (let player of queuedMatch.players) {
                try {
                    await player.notify(match_embed);
                } catch (e) {
                    // if we can't notify them, that's ok
                }
            }
        });
    }

    private async player_dm(match: QueuedMatch): Promise<MessageEmbed> {
        const brawl_api_wrapper = BrawlApiWrapper.getInstance();

        // collect players
        // team a
        let players_a = "";
        for (let player of match.teamA.players) {
            // append the name to the string
            let name = await brawl_api_wrapper.getNameByID(player.id);
            players_a = players_a.concat(`${name}\n`);
        }
        // team b
        let players_b = "";
        for (let player of match.teamB.players) {
            // append the name to the string
            let name = await brawl_api_wrapper.getNameByID(player.id);
            players_b = players_b.concat(`${name}\n`);
        }

        //build the embed
        const embed = new MessageEmbed()
            .setTitle('You found a match!')
            .setColor(Config.embed_colour)
            .addField('Queue', match.queue.blueprint.displayName, true)
            .addField('Region', match.queue.region, true)
            .addField('Motivation', 'You can do it!', true)
            .addField('Team 1', players_a, true)
            .addField('Team 2', players_b, true);
        return embed;
    }

    public static getInstance(): MatchManager {
        if (!MatchManager.instance)
            MatchManager.instance = new MatchManager();
        return MatchManager.instance;
    }

    public startMatch(match: QueuedMatch) {
        // check if the match can legitimately be started without problems
        for (let player of match.players) {
            if (player.match) {
                throw new Error(`Player ${player.id} is already in a match!`);  // TODO: maybe players name instead?
            }
        }
        // remove player from the queue
        for (let player of match.players) {
            player.queue = undefined;
            if (player.team) {
                player.team.queue = undefined;
            }
        }
        // start the match
        for (let player of match.players) {
            player.match = match;
            if (player.team) {
                player.team.match = match;
            }
        }
    }

    public async report(player_reporting: Player, score: Score) {
        // a player reports a match on Discord
        const match = player_reporting.match;
        if (!match) {
            throw new Error("Player not in a Match!");
        }
        const winner = match.scoreToWinner(player_reporting, score);
        await match.report(winner);
        // the match is over, links can be deleted
        for (let player of match.players) {
            player.match = undefined;
            player.team!.match = undefined;
        }
    }
}
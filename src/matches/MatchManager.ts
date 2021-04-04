import QueueManager from "../queues/QueueManager";
import { Score } from "./Elo";
import { QueuedMatch } from "./Match";
import Player from "../players/Player";
import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import DBManager, { DBPlayer } from "../db/DBManager";

export default class MatchManager {
    // manages matches and reports results to db
    private static instance: MatchManager;
    public ongoingMatches: QueuedMatch[];

    private constructor() {
        this.ongoingMatches = [];
        const queueManager: QueueManager = QueueManager.getInstance();
        queueManager.onMatchFound.subscribe(queuedMatch => {
            this.startMatch(queuedMatch);
        });
    }

    public static getInstance(): MatchManager {
        if (!MatchManager.instance)
            MatchManager.instance = new MatchManager();
        return MatchManager.instance;
    }

    private removeMatch(match: QueuedMatch) {
        const index = this.ongoingMatches.indexOf(match);
        if (index > -1) {
            this.ongoingMatches.splice(index, 1);
        }
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
            player.team!.queue = undefined;
        }
        // start the match
        this.ongoingMatches.push(match);
        for (let player of match.players) {
            player.match = match;
            player.team!.match = match;
        }
    }

    public report(player_reporting: Player, score: Score) {
        // a player reports a match on Discord
        const match = this.findMatch(player_reporting);
        if (!match) {
            throw new Error("Player not in a Match!");
        }
        const winner = match.scoreToWinner(player_reporting, score);
        match.report(winner);
        // remove it from ongoing matches
        this.removeMatch(match);
        // the match is over, links can be deleted
        for (let player of match.players) {
            player.match = undefined;
            player.team!.match = undefined;
        }
    }

    findMatch(player: Player): QueuedMatch | undefined {
        // look for a match containing the player
        for (let match of this.ongoingMatches) {
            for (let matchPlayer of match.players) {
                if (player == matchPlayer) {
                    return match;
                }
            }
        }
        // nothing found
        return undefined;
    }
}
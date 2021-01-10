import QueueManager from "../queue/QueueManager";
import { Score } from "./Elo";
import { QueuedMatch } from "./Match";
import Player from "./Player";
import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'

export default class MatchManager {
    // manages matches and reports results to db
    private static instance: MatchManager;
    public ongoingMatches: QueuedMatch[];

    private constructor() {
        this.ongoingMatches = [];
        const queueManager: QueueManager = QueueManager.getInstance();
        queueManager.onMatchFound.subscribe(queuedMatch => {
            this.addMatch(queuedMatch);
        })
    }

    public getInstance(): MatchManager {
        if (MatchManager.instance)
            return MatchManager.instance;
        return new MatchManager();
    }

    removeMatch(match: QueuedMatch) {
        const index = this.ongoingMatches.indexOf(match);
        if (index > -1) {
            this.ongoingMatches.splice(index, 1);
        }
    }

    addMatch(match: QueuedMatch) {
        this.ongoingMatches.push(match);
    }

    report(player: Player, score: Score) {
        // a player reports a match on Discord
        const match = this.findMatch(player);
        if (!match) {
            throw new Error("Player not in a Match!");
        }
        const winner = match.scoreToWinner(player, score);
        match.report(winner);
        // remove it from ongoing matches
        this.removeMatch(match);
        // save new results to db
        open({
            filename: "../../elo.db",   // TODO: doesn't work yet i believe
            driver: sqlite3.cached.Database,
            mode: sqlite3.OPEN_READWRITE
        }).then((db) => {
            this.updateDB(db, match);
        });
    }

    private async updateDB(db: Database<sqlite3.Database, sqlite3.Statement>, match: QueuedMatch) {
        // make sure table name exists to prevent SQL Injections
        if (await this.existsTable(db, match.queue.dbname)) {
            // save new elo to db for every player in the match
            for (let player of match.players) {
                // search for player in queue db
                let result = await db.get(`SELECT * FROM ${match.queue.dbname} WHERE DiscordID = ?`, [player.id]) as DBPlayer;  // player.id is Discord ID
                // check if they were found
                if (!result) {
                    // add player to db if they don't already exist
                    await db.run(`INSERT INTO ${match.queue.dbname} VALUES(?,?)`, [player.id, player.elo]);
                } else {
                    // update elo if they do already exist
                    await db.run(`UPDATE ${match.queue.dbname} SET Elo = ?`, [player.elo]);
                }
            }
        }
    }

    private async existsTable(db: Database<sqlite3.Database, sqlite3.Statement>, table: string): Promise<boolean> {
        const result = await db.get("SELECT 1 FROM sqlite_master WHERE type='table' and name = ?", table) as number // get 1 if table name exists
        // undefined if not found
        if (result)
            return true;
        return false;
    }

    findMatch(player: Player): QueuedMatch | null {
        // look for a match containing the player
        for (let match of this.ongoingMatches) {
            for (let matchPlayer of match.players) {
                if (player == matchPlayer) {
                    return match;
                }
            }
        }
        // nothing found
        return null;
    }
}

interface DBPlayer {
    Name: string,
    Elo: number
}
import { SubEvent } from "sub-events";
import Config from "../Config"
import Queue, { QueueBlueprint } from "../queues/Queue";
import Elo, { Score } from "../matches/Elo"
import DBManager, { DBPlayer } from "../db/DBManager";
import Team from "./Team";
import { QueuedMatch } from "../matches/Match";

export default class Player {
    public readonly id: string; // discord id
    public readonly onEloChange: SubEvent<number>;  // emits whenever player elo changes
    public _queue: Queue | undefined;    // Queue that the player is searching for match in
    private _match: QueuedMatch | undefined;  // Match that the player is fighting in
    private _elo: Map<QueueBlueprint, number>;
    public team: Team | undefined;
    private _setup: boolean;    // true if everything is setup (waited for db elo and stuff)

    constructor(id: string) {
        this.id = id;
        this._elo = new Map();
        this._setup = false;
        this.onEloChange = new SubEvent<number>();
        this.setup();
    }

    public async setup() {
        // await player.setup() to use elo stuff
        // this can be "locked" this way because js is event-loop concurrent
        if (!this._setup) {
            await this.readEloFromDB()
            this._setup = true
        }
    }

    public async readEloFromDB() {
        // gets a map of the elo for all the pools from the db
        const db = await DBManager.getInstance().db;
        for (let blueprint of Config.queues) {
            if (await DBManager.getInstance().existsTable(blueprint.dbname)) {
                let elo_rows = await db.get(`SELECT * FROM ${blueprint.dbname} WHERE Name = ?`, [this.id]) as DBPlayer; // get entry from the db
                let db_elo = Config.eloOnStart  // initiate elo
                if (elo_rows) {    // if there is an entry, read it
                    db_elo = elo_rows.Elo;
                }
                this._elo.set(blueprint, db_elo);
            }
        }
    }

    private async updateEloInDB(queue: Queue) {
        // updates the elo in the db (only for the given queue)
        const dbManager: DBManager = DBManager.getInstance();
        const db = await dbManager.db;
        // make sure table name exists to prevent SQL Injections
        if (await dbManager.existsTable(queue.dbname)) {
            // search for player in queue db
            let result = await db.get(`SELECT * FROM ${queue.dbname} WHERE Name = ?`, [this.id]) as DBPlayer;  // player.id is Discord ID
            // check if they were found
            if (!result) {
                // add player to db if they don't already exist
                await db.run(`INSERT INTO ${queue.dbname} VALUES(?,?)`, [this.id, this.getEloInQueue(queue.blueprint)]);
            } else {
                // update elo if they do already exist
                await db.run(`UPDATE ${queue.dbname} SET Elo = ? WHERE Name = ?`, [this.getEloInQueue(queue.blueprint), this.id]);
            }
        }
    }

    public getEloInQueue(queue: QueueBlueprint): number {
        // figure out in which queue we want to set the elo
        const elo = this._elo.get(queue);
        if (elo)
            return elo;
        return Config.eloOnStart;
    }

    public get elo(): number {
        // figure out in which queue we want to set the elo
        let queue: Queue | undefined = undefined;
        if (this.match)
            queue = this.match.queue;
        else if (this.queue)
            queue = this.queue;
        // get the elo
        if (queue)
            return this.getEloInQueue(queue.blueprint);
        return Config.eloOnStart;
    }

    public set elo(elo: number) {
        // figure out in which queue we want to set the elo
        let queue: Queue | undefined = undefined;
        if (this.match) {
            queue = this.match.queue;
        } else if (this.queue) {
            queue = this.queue;
        }
        // set the elo
        if (queue) {
            let oldElo = this._elo.get(queue.blueprint);
            if (!oldElo)
                oldElo = Config.eloOnStart;
            this._elo.set(queue.blueprint, elo);
            this.updateEloInDB(queue);
            this.onEloChange.emit(elo - oldElo);
        }
    }

    public set queue(queue: Queue | undefined) {    // does not include them actually joining the pool
        if (queue != undefined) {
            if (!this._queue) {
                this._queue = queue;
            } else {
                throw new Error("Player is already in a queue!");
            }
        } else {
            this._queue = undefined;
        }
    }

    public get queue(): Queue | undefined {
        return this._queue;
    }

    public set match(match: QueuedMatch | undefined) {
        if (match != undefined) {
            if (!this._match) {
                this._match = match;
            } else {
                throw new Error("Player is already in a match!");
            }
        } else {
            this._match = undefined;
        }
    }

    public get match(): QueuedMatch | undefined {
        return this._match;
    }

    public toString(): string {
        let to_string = `${this.id}:`;
        for (let blueprint of this._elo.keys()) {
            to_string = to_string.concat(`\t${blueprint.displayName}:\t${this.getEloInQueue(blueprint)} (${this.getRank(blueprint)})`);
        }
        return to_string;
    }

    public getK(score: Score) {
        // K-Factor, used to determine the weight of a win or a loss (or a draw) depending on the elo
        switch (score) {
            case Score.Win: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnWin, Config.upperBoundKOnWin, this.elo);
            case Score.Loss: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnLoss, Config.upperBoundKOnLoss, this.elo);
            case Score.Draw: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnDraw, Config.upperBoundKOnDraw, this.elo);
        }
    }

    public getRank(blueprint: QueueBlueprint): string {
        // (kind of) binary search to get the rank for a given player elo
        const elo = this.getEloInQueue(blueprint);
        // initate l and r
        let lowerBound: number = 0;
        let upperBound: number = Config.ranks.length - 1;
        // check the boundaries
        if (elo < Config.ranks[lowerBound].start)
            return Config.ranks[lowerBound].name;
        if (elo > Config.ranks[upperBound].start)
            return Config.ranks[upperBound].name;
        // loop until we have a nice tight interval
        while (upperBound - lowerBound > 1) {
            let mid: number = Math.floor((lowerBound + upperBound) / 2);
            if (elo < Config.ranks[mid].start) {
                // mid can be new upper bound
                upperBound = mid;
            } else if (elo > Config.ranks[mid].start) {
                // mid can be new lower bound
                lowerBound = mid;
            } else {
                // exactly found our elo
                return Config.ranks[mid].name;
            }
        }
        return Config.ranks[lowerBound].name;
    }
}

export interface Rank {
    name: string;
    start: number;
}
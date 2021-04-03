import { SubEvent } from "sub-events";
import Config from "../Config"
import Queue, { QueueBlueprint } from "../queue/Queue";
import Elo, { Score } from "./Elo"
import DBManager, { DBPlayer } from "../db/DBManager";
import Team from "../queue/Team";

export default class Player {
    public readonly id: string; // discord id
    public readonly onEloChange: SubEvent<number>;  // emits whenever player elo changes
    public _queue: Queue | undefined;    // Queue that the player is searching for match / fighting in
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
                if (!elo_rows) {    // if there are no entries in the db, save the Config.eloOnStart (the current) value
                    db.run(`INSERT INTO ${blueprint.dbname} VALUES(?,?)`, [this.id, db_elo]);
                } else {    // if there is an entry, read it
                    db_elo = elo_rows.Elo;
                }
                this._elo.set(blueprint, db_elo);
            }
        }
    }

    private async updateEloInDB() {
        // updates the elo in the db (only for the queue the player is in rn)
        if (this.queue) {
            const db = await DBManager.getInstance().db;
            if (await DBManager.getInstance().existsTable(this.queue.dbname)) {
                db.run(`UPDATE ${this.queue.dbname} SET Elo = ? WHERE Name = ?`, [this.elo, this.id]);
            }
        }
    }

    public get elo(): number {
        if (this.queue) {
            const elo = this._elo.get(this.queue.blueprint);
            if (elo)
                return elo;
        }
        return Config.eloOnStart;
    }

    public set elo(elo: number) {
        if (this.queue) {
            let oldElo = this._elo.get(this.queue.blueprint);
            if (!oldElo)
                oldElo = Config.eloOnStart;
            this._elo.set(this.queue.blueprint, elo);
            this.updateEloInDB();
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

    public toString(): string {
        return `${this.id}:\tElo: ${this.elo}\tRank: ${this.getRank()}`;
    }

    public getK(score: Score) {
        // K-Factor, used to determine the weight of a win or a loss (or a draw) depending on the elo
        switch (score) {
            case Score.Win: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnWin, Config.upperBoundKOnWin, this.elo);
            case Score.Loss: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnLoss, Config.upperBoundKOnLoss, this.elo);
            case Score.Draw: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnDraw, Config.upperBoundKOnDraw, this.elo);
        }
    }

    public getRank(): string {
        // (kind of) binary search to get the rank for a given player elo
        // initate l and r
        let lowerBound: number = 0;
        let upperBound: number = Config.ranks.length - 1;
        // check the boundaries
        if (this.elo < Config.ranks[lowerBound].start)
            return Config.ranks[lowerBound].name;
        if (this.elo > Config.ranks[upperBound].start)
            return Config.ranks[upperBound].name;
        // loop until we have a nice tight interval
        while (upperBound - lowerBound > 1) {
            let mid: number = Math.floor((lowerBound + upperBound) / 2);
            if (this.elo < Config.ranks[mid].start) {
                // mid can be new upper bound
                upperBound = mid;
            } else if (this.elo > Config.ranks[mid].start) {
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
import { SubEvent } from "sub-events";
import Config from "../Config"
import Queue, { QueueBlueprint } from "../queue/Queue";
import Elo, { Score } from "./Elo"
import DBManager, { DBPlayer } from "../db/DBManager";

export default class Player {
    public readonly id: string; // discord id
    public queue: Queue | undefined;    // Queue that the player is searching for match / fighting in
    public _elo: Map<QueueBlueprint, number>;
    public readonly onEloChange: SubEvent<number>;

    constructor(id: string) {
        this.id = id;
        this._elo = new Map<QueueBlueprint, number>();
        this.onEloChange = new SubEvent<number>();
    }

    public async readEloFromDB() {
        const db = await DBManager.getInstance().db;
        for (let blueprint of Config.queues) {
            if (await DBManager.getInstance().existsTable(blueprint.dbname)) {
                let elo = (await db.get(`SELECT * FROM ${blueprint.dbname} WHERE Name = ?`, [this.id]) as DBPlayer).Elo;
                this._elo.set(blueprint, elo);
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
            this.onEloChange.emit(elo - oldElo);
        }
    }

    public setQueue(queue: Queue) {    // does not include them actually joining the pool
        if (!this.queue)
            this.queue = queue;
        else
            throw new Error("Player is already in a queue!");
    }

    public unsetQueue() {
        this.queue = undefined;
    }

    public toString(): string {
        return `${this.id}:\tElo: ${this._elo}\tRank: ${this.getRank()}`;
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
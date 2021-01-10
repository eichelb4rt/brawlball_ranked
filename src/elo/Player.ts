import { SubEvent } from "sub-events";
import Config from "../Config"
import Elo, { Score } from "./Elo"

export default class Player {
    public readonly id: string; // discord id
    public _elo: number = 800;  // these values will be overwritten
    public readonly onEloChange: SubEvent<number>;

    constructor(id: string, elo: number) {
        this.id = id;
        this._elo = elo;
        this.onEloChange = new SubEvent<number>();
    }

    public get elo() {
        return this._elo;
    }

    public set elo(elo: number) {
        const oldElo = this._elo;
        this._elo = elo;
        this.onEloChange.emit(elo - oldElo);    // emit elo gain
    }

    public toString(): string {
        return `${this.id}:\tElo: ${this._elo}\tRank: ${this.getRank()}`;
    }

    public getK(score: Score) {
        // K-Factor, used to determine the weight of a win or a loss (or a draw) depending on the elo
        switch (score) {
            case Score.Win: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnWin, Config.upperBoundKOnWin, this._elo);
            case Score.Loss: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnLoss, Config.upperBoundKOnLoss, this._elo);
            case Score.Draw: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnDraw, Config.upperBoundKOnDraw, this._elo);
        }
    }

    public getRank(): string {
        // (kind of) binary search to get the rank for a given player elo
        // initate l and r
        let lowerBound: number = 0;
        let upperBound: number = Config.ranks.length - 1;
        // check the boundaries
        if (this._elo < Config.ranks[lowerBound].start)
            return Config.ranks[lowerBound].name;
        if (this._elo > Config.ranks[upperBound].start)
            return Config.ranks[upperBound].name;
        // loop until we have a nice tight interval
        while (upperBound - lowerBound > 1) {
            let mid: number = Math.floor((lowerBound + upperBound) / 2);
            if (this._elo < Config.ranks[mid].start) {
                // mid can be new upper bound
                upperBound = mid;
            } else if (this._elo > Config.ranks[mid].start) {
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
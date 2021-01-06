import Config from "../Config"
import Elo, { Score } from "./Elo"

export default class Player {
    public readonly id: string; // discord id
    private elo: number = 800;  // these values will be overwritten

    constructor(id: string, elo: number) {
        this.id = id;
        this.elo = elo;
    }

    public getElo(): number { return this.elo; }
    public setElo(elo: number) { this.elo = elo; }

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
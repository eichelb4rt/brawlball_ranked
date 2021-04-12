import Config from "../Config";
import Player from "../players/Player"

export default class Elo {
    // static class for elo calculations
    public static expectedScore(myElo: number, enemyElo: number): number {
        return 1 / (1 + Math.pow(10, (enemyElo - myElo) / 400));
    }

    public static newElo(player: Player, score: Score, expScore: number): number {
        // calculated the elo added to the old elo
        let eloDiff = Math.floor(player.getK(score) * (score - expScore));
        // gain at least 1 elo on win
        if (score == Score.Win && eloDiff < 1) {
            eloDiff = 1;
        }
        return player.elo + eloDiff;
    }

    public static linearFunction(x1: number, x2: number, y1: number, y2: number, x: number): number {
        // linear function with cut off edges from (x1, y1) to (x2, y2)
        if (x < x1) {
            return y1;
        } else if (x < x2) {  // linear function from lower bound to upper bound
            return ((x - x1) / (x2 - x1)) * (y2 - y1) + y1;
        } else {  // >= rightX
            return y2;
        }
    }

    public static score_string(score: Score): string {
        switch(score) {
            case Score.Win: return "W";
            case Score.Loss: return "L";
            case Score.Draw: return "tied";
        }
    }
    public static elo_to_rank(elo: number): string {
        // (kind of) binary search to get the rank for a given player elo
        // initate l and r
        let lowerBound: number = 0;
        let upperBound: number = Config.ranks.length - 1;
        // check the boundaries
        if (elo <= Config.ranks[lowerBound].start)
            return Config.ranks[lowerBound].name;
        if (elo >= Config.ranks[upperBound].start)
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

export enum Score {
    Win = 1,
    Loss = 0,
    Draw = 0.5
}
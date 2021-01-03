import Player from "./Player"

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
        return player.getElo() + eloDiff;
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
}

export enum Score {
    Win = 1,
    Loss = 0,
    Draw = 0.5
}
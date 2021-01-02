import Config from "./Config";

export class Player {
    private elo: number = 800;  // these values will be overwritten

    constructor(elo: number) {
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
}

class Elo {
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

export class TwoPlayerGame {
    private readonly playerA: Player;
    private readonly playerB: Player;

    constructor(playerA: Player, playerB: Player) {
        this.playerA = playerA;
        this.playerB = playerB;
    }

    public report(winner: Winner) {
        // determine the actual scores
        let scoreA: Score;
        let scoreB: Score;
        if (winner == Winner.PlayerA) {
            scoreA = Score.Win;
            scoreB = Score.Loss;
        } else if (winner == Winner.PlayerB) {
            scoreA = Score.Loss;
            scoreB = Score.Win;
        } else {
            scoreA = Score.Draw;
            scoreB = Score.Draw;
        }

        // determine the expected scores
        let expScoreA: number = Elo.expectedScore(this.playerA.getElo(), this.playerB.getElo());
        let expScoreB: number = Elo.expectedScore(this.playerB.getElo(), this.playerA.getElo());

        // calc new elo
        let newEloA = Elo.newElo(this.playerA, scoreA, expScoreA);
        let newEloB = Elo.newElo(this.playerB, scoreB, expScoreB);

        // update Elo
        this.playerA.setElo(newEloA);
        this.playerB.setElo(newEloB);
    }
}

export default class TeamGame {
    private readonly teamA: Player[];
    private readonly teamB: Player[];

    constructor(teamA: Player[], teamB: Player[]) {
        this.teamA = teamA;
        this.teamB = teamB;
    }

    public report(winner: Winner) {
        // determine the actual scores
        let scoreA: Score;
        let scoreB: Score;
        if (winner == Winner.PlayerA) {
            scoreA = Score.Win;
            scoreB = Score.Loss;
        } else if (winner == Winner.PlayerB) {
            scoreA = Score.Loss;
            scoreB = Score.Win;
        } else {
            scoreA = Score.Draw;
            scoreB = Score.Draw;
        }

        // calculate the average elo of every team for the expected scores
        let avgEloA: number = 0;
        let avgEloB: number = 0;
        this.teamA.forEach(player => {
            avgEloA += player.getElo() / this.teamA.length;
        });
        this.teamB.forEach(player => {
            avgEloB += player.getElo() / this.teamB.length;
        });

        // calculate the expected scores for every player (calculated with average enemy elo) and update elo
        this.teamA.forEach(player => {
            // calculated as if every player in team A fought against the average of team B
            let expScore = Elo.expectedScore(player.getElo(), avgEloB);
            let newElo = Elo.newElo(player, scoreA, expScore);
            player.setElo(newElo);
        });
        this.teamB.forEach(player => {
            // calculated as if every player in team B fought against the average of team A
            let expScore = Elo.expectedScore(player.getElo(), avgEloA);
            let newElo = Elo.newElo(player, scoreB, expScore);
            player.setElo(newElo);
        });
    }
}

export enum Winner {
    PlayerA,
    PlayerB,
    None
}

enum Score {
    Win = 1,
    Loss = 0,
    Draw = 0.5
}
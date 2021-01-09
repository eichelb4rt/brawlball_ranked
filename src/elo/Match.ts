import Player from "./Player"
import Elo, { Score } from "./Elo"

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
        let expScoreA: number = Elo.expectedScore(this.playerA.elo, this.playerB.elo);
        let expScoreB: number = Elo.expectedScore(this.playerB.elo, this.playerA.elo);

        // calc new elo
        let newEloA = Elo.newElo(this.playerA, scoreA, expScoreA);
        let newEloB = Elo.newElo(this.playerB, scoreB, expScoreB);

        // update Elo
        this.playerA.elo = newEloA;
        this.playerB.elo = newEloB;
    }
}

export default class Match {
    public readonly teamA: Player[];
    public readonly teamB: Player[];
    public readonly players: Player[];  // all the players

    constructor(teamA: Player[], teamB: Player[]) {
        this.teamA = teamA;
        this.teamB = teamB;
        this.players = teamA.concat(teamB);
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
            avgEloA += player.elo / this.teamA.length;
        });
        this.teamB.forEach(player => {
            avgEloB += player.elo / this.teamB.length;
        });

        // calculate the expected scores for every player (calculated with average enemy elo) and update elo
        this.teamA.forEach(player => {
            // calculated as if every player in team A fought against the average of team B
            let expScore = Elo.expectedScore(player.elo, avgEloB);
            let newElo = Elo.newElo(player, scoreA, expScore);
            player.elo = newElo;
        });
        this.teamB.forEach(player => {
            // calculated as if every player in team B fought against the average of team A
            let expScore = Elo.expectedScore(player.elo, avgEloA);
            let newElo = Elo.newElo(player, scoreB, expScore);
            player.elo = newElo;
        });
    }
}

export enum Winner {
    PlayerA,
    PlayerB,
    None
}
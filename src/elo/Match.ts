import Player from "./Player"
import Elo, { Score } from "./Elo"
import Queue from "../queue/Queue";

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
        let scoreA: Score = this.winnerToScore(this.teamA[0], winner);
        let scoreB: Score = this.winnerToScore(this.teamB[0], winner);

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

    public scoreToWinner(player: Player, score: Score): Winner {
        if (this.teamA.includes(player)) {
            switch (score) {
                case Score.Win: return Winner.PlayerA;
                case Score.Draw: return Winner.None;
                case Score.Loss: return Winner.PlayerB;
            }
        } else if (this.teamB.includes(player)) {
            switch (score) {
                case Score.Win: return Winner.PlayerB;
                case Score.Draw: return Winner.None;
                case Score.Loss: return Winner.PlayerA;
            }
        } else {
            throw new Error("Player not in Match!");
        }
    }

    public winnerToScore(player: Player, winner: Winner): Score {
        if (this.teamA.includes(player)) {
            switch (winner) {
                case Winner.PlayerA: return Score.Win;
                case Winner.PlayerB: return Score.Loss;
                case Winner.None: return Score.Draw;
            }
        } else if (this.teamB.includes(player)) {
            switch (winner) {
                case Winner.PlayerA: return Score.Loss;
                case Winner.PlayerB: return Score.Win;
                case Winner.None: return Score.Draw;
            }
        } else {
            throw new Error("Player not in Match!");
        }
    }

    public withQueue(queue: Queue): QueuedMatch {
        let clone = new QueuedMatch(this.teamA, this.teamB, queue);
        // (continue cloning properties if needed)
        return clone;
    }
}

export class QueuedMatch extends Match {
    public readonly queue: Queue;

    constructor(teamA: Player[], teamB: Player[], queue: Queue) {
        super(teamA, teamB);
        this.queue = queue;
    }
}

export enum Winner {
    PlayerA,
    PlayerB,
    None
}
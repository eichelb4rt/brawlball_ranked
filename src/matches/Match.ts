import Player from "../players/Player"
import Elo, { Score } from "./Elo"
import Queue from "../queues/Queue";
import Team from "../players/Team";

export default class Match {
    public readonly teamA: Team;
    public readonly teamB: Team;
    public readonly players: Player[];  // all the players

    constructor(teamA: Team, teamB: Team) {
        this.teamA = teamA;
        this.teamB = teamB;
        this.players = teamA.players.concat(teamB.players);
    }

    public async report(winner: Teams) {
        // determine the actual scores
        let scoreA: Score = this.winnerToScore(this.teamA.players[0], winner);
        let scoreB: Score = this.winnerToScore(this.teamB.players[0], winner);

        // calculate the average elo of every team for the expected scores
        let avgEloA: number = this.teamA.averageElo();
        let avgEloB: number = this.teamB.averageElo();

        // calculate the expected scores for every player (calculated with average enemy elo) and update elo
        this.teamA.players.forEach(player => {
            // calculated as if every player in team A fought against the average of team B
            let expScore = Elo.expectedScore(player.elo, avgEloB);
            let newElo = Elo.newElo(player, scoreA, expScore);
            player.elo = newElo;
        });
        this.teamB.players.forEach(player => {
            // calculated as if every player in team B fought against the average of team A
            let expScore = Elo.expectedScore(player.elo, avgEloA);
            let newElo = Elo.newElo(player, scoreB, expScore);
            player.elo = newElo;
        });
    }

    public scoreToWinner(player: Player, score: Score): Teams {
        if (this.teamA.players.includes(player)) {
            switch (score) {
                case Score.Win: return Teams.TeamA;
                case Score.Draw: return Teams.None;
                case Score.Loss: return Teams.TeamB;
            }
        } else if (this.teamB.players.includes(player)) {
            switch (score) {
                case Score.Win: return Teams.TeamB;
                case Score.Draw: return Teams.None;
                case Score.Loss: return Teams.TeamA;
            }
        } else {
            throw new Error("Player not in Match!");
        }
    }

    public winnerToScore(player: Player, winner: Teams): Score {
        if (this.teamA.players.includes(player)) {
            switch (winner) {
                case Teams.TeamA: return Score.Win;
                case Teams.TeamB: return Score.Loss;
                case Teams.None: return Score.Draw;
            }
        } else if (this.teamB.players.includes(player)) {
            switch (winner) {
                case Teams.TeamA: return Score.Loss;
                case Teams.TeamB: return Score.Win;
                case Teams.None: return Score.Draw;
            }
        } else {
            throw new Error("Player not in Match!");
        }
    }

    public static teamToScore(team: Teams, winner: Teams): Score {
        if (winner == Teams.None) {
            return Score.Draw;
        } else if (team == winner) {
            return Score.Win;
        } else {
            return Score.Loss;
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

    constructor(teamA: Team, teamB: Team, queue: Queue) {
        super(teamA, teamB);
        this.queue = queue;
    }
}

export enum Teams {
    TeamA,
    TeamB,
    None
}
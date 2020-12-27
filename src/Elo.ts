import Config from "./Config";

export class Player {
    public readonly k: number = 20; // K-Factor
    public elo: number;

    constructor(elo: number) {
        this.elo = elo;
        if (elo < Config.lowerBoundElo) {
            this.k = Config.lowerBoundK;
        } else if (elo < Config.upperBoundElo) {  // linear function from lower bound to upper bound
            this.k = ((elo - Config.lowerBoundElo) / (Config.upperBoundElo - Config.lowerBoundElo)) * (Config.upperBoundK - Config.lowerBoundK) + Config.lowerBoundK;
        } else {  // >= upperBoundElo
            this.k = Config.upperBoundK;
        }
    }
}

export class TwoPlayerGame {
    private readonly player: Player;
    private readonly enemy: Player;

    constructor(player: Player, enemy: Player) {
        this.player = player;
        this.enemy = enemy;
    }

    public report(result: Result) {
        let score: number = TwoPlayerGame.score(result);
        let exp_score: number = TwoPlayerGame.expectedScore(this.player.elo, this.enemy.elo);
        let eloDiff = Math.floor(this.player.k * (score - exp_score))
        // gain at least 1 elo on win
        if (result == Result.Win && eloDiff < 1) {
            eloDiff = 1
        }
        this.player.elo += eloDiff;
    }

    private static expectedScore(myElo: number, enemyElo: number): number {
        return 1 / (1 + Math.pow(10, (enemyElo - myElo) / 400));
    }

    private static score(result: Result): number {
        switch (result) {
            case Result.Win: return 1;
            case Result.Loss: return 0;
            case Result.Draw: return 0.5;
        }
    }
}

export default class Game {
    private readonly players: Player[];
    private readonly enemies: Player[];

    constructor(players: Player[], enemies: Player[]) {
        this.players = players;
        this.enemies = enemies;
    }

    public report(result: Result) {
        // every player plays a TwoPlayerGame against the average of the enemy players
        let avgElo: number = 0;
        this.enemies.forEach(enemy => {
            avgElo += enemy.elo / this.enemies.length;
        });
        let avgEnemy: Player = new Player(avgElo);
        
        this.players.forEach(player => {
            (new TwoPlayerGame(player, avgEnemy)).report(result);
        });
    }
}

export enum Result {
    Win,
    Loss,
    Draw
}
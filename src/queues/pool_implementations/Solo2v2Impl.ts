import Match from "../../matches/Match";
import Player from "../../players/Player";
import Pool, { PoolSystem } from "../Pool";
import Team, { JoinConfig } from "../../players/Team";

export default class Solo2v2Impl extends Pool {
    static readonly poolSystem = PoolSystem.Solo2v2;
    readonly maxPremadeSize = 1;
    readonly maxTeamSize = 2;

    private players: Player[];
    private readonly min_fairness = 20;

    constructor() {
        super();
        this.players = [];
    }

    add(team: Team): void {
        for (let player of team.players) {
            this.players.push(player)
        }
    }

    remove(players: Player[]): void {
        // should remove every team that contains the players passed as argument
        for (let player of players) {
            let index = this.players.indexOf(player);
            this.players.splice(index, 1);
        }
    }

    async getMatch(): Promise<Match | null> {
        if (this.players.length >= 2 * this.maxTeamSize) {
            // get a random set of players (2 teams)
            let players: Player[] = this.getRandom(this.players, 2 * this.maxTeamSize);
            // put the first half in team a
            let teamA: Team = new Team();
            for (let i = 0; i < this.maxTeamSize; i++) {
                teamA.join(players[i], JoinConfig.System)
            }
            // put the second half in team b
            let teamB: Team = new Team();
            for (let i = this.maxTeamSize; i < 2 * this.maxTeamSize; i++) {
                teamB.join(players[i], JoinConfig.System)
            }
            // return the found match
            return new Match(teamA, teamB);
        }
        return null;
    }

    private getRandom(arr: Player[], n: number): Player[] {
        // https://stackoverflow.com/questions/19269545/how-to-get-a-number-of-random-elements-from-an-array
        let result: Player[] = new Array(n);
        let len: number = arr.length;
        let taken: number[] = new Array(len);
        if (n > len)
            throw new RangeError("getRandom: more elements taken than available");
        while (n--) {
            let x = Math.floor(Math.random() * len);
            result[n] = arr[x in taken ? taken[x] : x];
            taken[x] = --len in taken ? taken[len] : len;
        } 
        return result;
    }

    private evaluate(match: Match): number {
        // evaluates the quality or fairness of a match depending on the skill levels
        // first, sort the players by elo and calc euclidean distance
        let players_a_sorted = match.teamA.players;
        let players_b_sorted = match.teamB.players;
        function player_sort(player1: Player, player2: Player) {
            if (player1.elo > player2.elo) return 1;
            if (player1.elo < player2.elo) return -1;
            return 0;
        }
        players_a_sorted.sort(player_sort);
        players_b_sorted.sort(player_sort);
        return 0;
    }
}
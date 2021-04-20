import Match from "../../matches/Match";
import Player from "../../players/Player";
import Pool from "../Pool";
import Team, { JoinConfig } from "../../players/Team";
import PoolSystem from "../PoolSystem";

export default class Team3v3Impl extends Pool {
    static readonly poolSystem = PoolSystem.Team3v3;
    readonly maxPremadeSize = 3;
    readonly maxTeamSize = 3;

    private players: Player[];
    private readonly min_fairness = 20;

    constructor() {
        super();
        this.players = [];
    }

    add(team: Team): void {
        for (let player of team.players) {
            this.players.push(player);
        }
    }

    remove(players: Player[]): void {
        // should remove every team that contains the players passed as argument
        for (let player of players) {
            let index = this.players.indexOf(player);
            this.players.splice(index, 1);
        }
    }

    async *getMatches(): AsyncGenerator<Match, void, void> {
        let match = await this.getMatch();
        while (match) {
            this.remove(match.players);
            yield match;
            match = await this.getMatch();
        }
    }

    async getMatch(): Promise<Match | undefined> {
        if (this.players.length >= 2 * this.maxTeamSize) {
            // get a random set of players (2 teams)
            let players: Player[] = this.getRandom(this.players, 2 * this.maxTeamSize);
            // put the first half in team a
            let teamA: Team = new Team();
            for (let i = 0; i < this.maxTeamSize; i++) {
                teamA.join(players[i], JoinConfig.System);
            }
            // put the second half in team b
            let teamB: Team = new Team();
            for (let i = this.maxTeamSize; i < 2 * this.maxTeamSize; i++) {
                teamB.join(players[i], JoinConfig.System);
            }
            // remove players from pool and return the found match
            return new Match(teamA, teamB);
        }
        return undefined;
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
}
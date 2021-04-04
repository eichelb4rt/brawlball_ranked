import Player from "../players/Player"
import Match from "../matches/Match";
import Team from "../players/Team";

// Data Structure for Pool of Players
export default abstract class Pool {    // can't make properties static with an interface
    static readonly poolSystem: PoolSystem;
    abstract readonly maxPremadeSize: number;
    abstract readonly maxTeamSize: number;

    abstract add(team: Team): void;
    abstract remove(players: Player[]): void;   // should remove every team that contains the players passed as argument
    abstract getMatch(): Promise<Match | null>;
}

export enum PoolSystem {
    Solo2v2,
    Team2v2,
    Solo3v3,
    Team3v3
}
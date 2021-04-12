import Player from "../players/Player"
import Match from "../matches/Match";
import Team from "../players/Team";
import PoolSystem from "./PoolSystem";

// Data Structure for Pool of Players
export default abstract class Pool {    // can't make properties static with an interface
    static readonly poolSystem: PoolSystem;
    abstract readonly maxPremadeSize: number;
    abstract readonly maxTeamSize: number;

    abstract add(team: Team): void;
    abstract remove(players: Player[]): void;   // should remove every team that contains the players passed as argument
    abstract getMatch(): Promise<Match | null>;
}
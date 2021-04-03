import Match from "../../elo/Match";
import Player from "../../elo/Player";
import Pool, { PoolSystem } from "../Pool";

export default class Solo3v3Impl extends Pool {
    static readonly poolSystem = PoolSystem.Solo3v3;
    readonly maxPremadeSize = 1;
    readonly maxTeamSize = 3;

    add(team: Player[]): void { }
    remove(players: Player[]): void { }   // should remove every team that contains the players passed as argument
    async getMatch(): Promise<Match | null> { return null; }
}
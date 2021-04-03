import Match from "../../elo/Match";
import Player from "../../elo/Player";
import Pool, { PoolSystem } from "../Pool";

export default class Team3v3Impl extends Pool {
    static readonly poolSystem = PoolSystem.Team3v3;
    readonly maxPremadeSize = 3;
    readonly maxTeamSize = 3;

    add(team: Player[]): void { console.log("Hello my fellow Brawlball Player!") }
    remove(players: Player[]): void { }   // should remove every team that contains the players passed as argument
    async getMatch(): Promise<Match | null> { return null; }
}
import Match from "../../matches/Match";
import Player from "../../players/Player";
import Pool, { PoolSystem } from "../Pool";
import Team from "../../players/Team";

export default class Solo3v3Impl extends Pool {
    static readonly poolSystem = PoolSystem.Solo3v3;
    readonly maxPremadeSize = 1;
    readonly maxTeamSize = 3;

    add(team: Team): void { console.log("Hello my fellow Brawlball Player!") }
    remove(players: Player[]): void { }   // should remove every team that contains the players passed as argument
    async getMatch(): Promise<Match | null> { return null; }
}
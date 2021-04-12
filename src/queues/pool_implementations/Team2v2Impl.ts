import Match from "../../matches/Match";
import Player from "../../players/Player";
import Pool from "../Pool";
import Team from "../../players/Team";
import PoolSystem from "../PoolSystem";

export default class Team2v2Impl extends Pool {
    static readonly poolSystem = PoolSystem.Team2v2;
    readonly maxPremadeSize = 2;
    readonly maxTeamSize = 2;

    add(team: Team): void { console.log("Hello my fellow Brawlball Player!") }
    remove(players: Player[]): void { }   // should remove every team that contains the players passed as argument
    async getMatch(): Promise<Match | null> { return null; }
}
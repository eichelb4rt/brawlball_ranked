import Match, { Teams } from "../../matches/Match";
import Player from "../../players/Player";
import Pool from "../Pool";
import Team, { JoinConfig } from "../../players/Team";
import PoolSystem from "../PoolSystem";
import Elo, { Score } from "../../matches/Elo";
import Role, { Roles } from "../../players/Role";
import Config from "../../Config";

export default class Team3v3Impl extends Pool {
    static readonly poolSystem = PoolSystem.Team3v3;
    readonly maxPremadeSize = 1;
    readonly maxTeamSize = 2;

    async add(team: Team): Promise<void> {
    }

    async remove(players: Player[]): Promise<void> {
    }

    async *getMatches(): AsyncGenerator<Match, void, void> {

    }
}
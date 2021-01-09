import Player from "../elo/Player"
import Match from "../elo/Match";

// Data Structure for Pool of Players
export default class Pool {
    public readonly poolSystem: PoolSystem;

    constructor(poolType: PoolSystem, players?: Player[]) {
        this.poolSystem = poolType;
    }

    public add(team: Player[]) { }

    public remove(players: Player[]) { }   // should remove every team that contains the players passed as argument

    public async getMatch(): Promise<Match | null> {
        return null;
    }
}

export enum PoolSystem {
    Solo2v2,
    Team2v2,
    Solo3v3,
    Team3v3
}
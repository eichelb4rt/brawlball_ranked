import Player from "../elo/Player"
import Match from "./Match";

// Data Structure for Pool of Players
export default class Pool {
    public readonly poolSystem: PoolSystem;

    constructor(poolType: PoolSystem, players?: Player[]) {
        this.poolSystem = poolType;
    }

    public add(player: Player) { }

    public getMatch(): Match | null {
        return null;
    }
}

export enum PoolSystem {
    Solo2v2,
    Team2v2,
    Solo3v3,
    Team3v3
}
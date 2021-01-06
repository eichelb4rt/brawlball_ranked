import Player from "../elo/Player"
import Match from "./Match";

// Data Structure for Pool of Players
export default class Pool {
    constructor(players?: Player[]) { }

    public add(player: Player) { }

    public getMatch(): Match | null {
        return null;
    }
}
import Player from "./Player";

export default class PlayerCache {
    // keeps players in memory instead of always reading from the db
    // players need to stay in memory because we want to know if they may already be in a queue which is data that i don't want to store in a db
    // atm it still caches every player until the end of time. This can be optimised and maybe rewritten as an interface.

    public static instance: PlayerCache
    public static getInstance(): PlayerCache {
        if (!this.instance) {
            this.instance = new this();
        }
        return this.instance;
    }

    private cache: Map<string, Player>

    private constructor() {
        this.cache = new Map()
    }

    // gets a Player from the cache. If not cached, creates a new one from the DB.
    public getPlayer(id: string): Player {
        // look in the map if there is already a player with this id
        let player: Player | undefined = this.cache.get(id)
        if (!player) {   // if not, make a new player with the id and cache it
            player = new Player(id);
            this.cache.set(id, player)
        }
        return player
    }
}
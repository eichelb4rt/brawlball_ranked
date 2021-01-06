import Pool, { PoolSystem } from "./Pool"
import Config from "../Config"
import Match from "./Match"

export default class Queue {
    public readonly name: string;   // name in the db
    public readonly displayName: string;    // name that is displayed
    public readonly region: string;
    public readonly pool: Pool;    // pool of players 

    constructor(blueprint: QueueBlueprint, region: string) {
        this.name = blueprint.name;
        if (blueprint.displayName) {
            this.displayName = blueprint.displayName;
        } else {
            this.displayName = blueprint.name;
        }
        this.region = region;
        this.pool = new Pool(blueprint.poolSystem);
    }

    public onMatchFound(listener: (args_0: Match) => void) {
        // method that gets called with a listener to handle a found match
        // check every (Config entry) seconds if there is a match that can be started
        setInterval(() => {
            // call the listener if match is not null
            let match: Match = this.pool.getMatch()!;
            listener(match);
        }, Config.queueWaitingTime * 1000)  // Config entry is in seconds, this is in milli seconds
    }
}

export interface QueueBlueprint {
    name: string;
    displayName?: string;
    poolSystem: PoolSystem;
}
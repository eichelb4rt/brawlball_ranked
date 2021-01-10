import Pool, { PoolSystem } from "./Pool"
import Config from "../Config"
import Match from "../elo/Match"
import { SubEvent } from "sub-events";

export default class Queue {
    public readonly dbname: string;   // name in the db
    public readonly displayName: string;    // name that is displayed
    public readonly region: string;
    public readonly pool: Pool;    // pool of players
    public readonly onMatchFound: SubEvent<Match>;

    constructor(blueprint: QueueBlueprint, region: string) {
        this.dbname = blueprint.name;
        if (blueprint.displayName) {
            this.displayName = blueprint.displayName;
        } else {
            this.displayName = blueprint.name;
        }
        this.region = region;
        this.pool = new Pool(blueprint.poolSystem);
        this.onMatchFound = new SubEvent<Match>();
        this.startSearching();
    }

    private startSearching() {
        // check every (Config entry) seconds if there is a match that can be started
        // delete the players in the match from the pool
        // emit Match to subcribers
        setInterval(async () => {
            let match: Match = (await this.pool.getMatch())!;   // ask the Pool to find a Match - NotNull assertion
            this.pool.remove(match.players);    // remove match from pool
            this.onMatchFound.emit(match);    // return the match to subscribers
        }, Config.queueWaitingTime * 1000)  // Config entry is in seconds, this is in milli seconds
    }
}

export interface QueueBlueprint {
    name: string;
    displayName?: string;
    poolSystem: PoolSystem;
}
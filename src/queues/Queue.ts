import Pool from "./Pool"
import PoolFactory from "./PoolFactory"
import Config from "../Config"
import Match from "../matches/Match"
import { SubEvent } from "sub-events";
import QueueBlueprint from "./QueueBlueprint";

export default class Queue {
    public readonly dbname: string;   // name in the db
    public readonly displayName: string;    // name that is displayed
    public readonly blueprint: QueueBlueprint;  // redundant but that's ok
    public readonly region: string;
    public readonly pool: Pool;    // pool of players
    public readonly onMatchFound: SubEvent<Match>;

    constructor(blueprint: QueueBlueprint, region: string) {
        this.dbname = blueprint.dbname;
        if (blueprint.displayName) {
            this.displayName = blueprint.displayName;
        } else {
            this.displayName = blueprint.dbname;
        }
        this.blueprint = blueprint;
        this.region = region;
        this.pool = PoolFactory.getInstance().newPool(blueprint.poolSystem);
        this.onMatchFound = new SubEvent<Match>();
        this.startSearching();
    }

    private startSearching() {
        // check every (Config entry) seconds if there is a match that can be started
        // delete the players in the match from the pool
        // emit Match to subcribers
        setInterval(async () => {
            let match: Match | null = (await this.pool.getMatch());   // ask the Pool to find a Match - NotNull assertion
            if (match) {
                // remove match players from pool and queue
                this.pool.remove(match.players);
                this.onMatchFound.emit(match);    // return the match to subscribers
            }
        }, Config.queueWaitingTime * 1000)  // Config entry is in seconds, this is in milli seconds
    }
}


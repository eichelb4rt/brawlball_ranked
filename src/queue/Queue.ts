import Pool from "./Pool"
import Config from "../Config"
import Match from "./Match"

export default class Queue {
    public readonly name: string;
    public readonly region: string;
    public readonly pool: Pool;    // pool of players 

    constructor(name: string, region: string) {
        this.name = name;
        this.region = region;
        this.pool = new Pool();
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
import { SubEvent } from "sub-events";
import Config from "../Config";
import Match, { QueuedMatch } from "../elo/Match";
import Queue, { QueueBlueprint } from "./Queue";

export default class QueueManager {
    // singleton
    // with this class we can find queues with specifying strings (poolname, region)
    // bundles all the onMatchFound events from a queue into 1
    
    private static instance: QueueManager;
    public readonly queues: QueueMap;   // [dbname, region]
    public readonly onMatchFound: SubEvent<QueuedMatch>;

    private constructor() {
        this.queues = {};
        this.onMatchFound = new SubEvent<QueuedMatch>();
        // make queues
        for (let blueprint of Config.queues) {
            let regionMap: RegionMap = {}   // prepare a map for the queues in each region
            for (let region of Config.regions) {
                // initialise every queue in every region
                let queue = new Queue(blueprint, region);
                // add the queue to the map so we can find them later
                // first add it to the region map
                regionMap[region] = queue;
                // listen for matches and emit a match when found (bundles all onMatchFound into 1)
                queue.onMatchFound.subscribe(match => {
                    this.onMatchFound.emit(match.withQueue(queue));
                });
            }
            // now add all the queues in the region to the queuemap
            this.queues[blueprint.dbname] = regionMap
        }
    }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
}

interface QueueMap {
    [key: string]: RegionMap
}

interface RegionMap {
    [key: string]: Queue
}
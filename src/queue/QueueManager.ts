import { SubEvent } from "sub-events";
import Config from "../Config";
import Match from "../elo/Match";
import Queue from "./Queue";

export default class QueueManager {
    // singleton
    private static instance: QueueManager;
    public readonly queues: Map<[string, string], Queue>;   // [name, region]
    public readonly onMatchFound: SubEvent<[Match, Queue]>;

    private constructor() {
        this.queues = new Map();
        this.onMatchFound = new SubEvent<[Match, Queue]>();
        // make queues
        for (let blueprint of Config.queues) {
            for (let region of Config.regions) {
                // initialise every queue in every region
                let queue = new Queue(blueprint, region);
                // add the queue to the map so we can find them later
                this.queues.set([blueprint.name, region], queue);
                // listen for matches and emit a match when found (bundles all onMatchFound into 1)
                queue.onMatchFound.subscribe(match => {
                    this.onMatchFound.emit([match, queue]);
                });
            }
        }
    }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
}
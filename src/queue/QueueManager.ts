import { SubEvent } from "sub-events";
import Config from "../Config";
import Match, { QueuedMatch } from "../elo/Match";
import Queue, { QueueBlueprint } from "./Queue";

export default class QueueManager {
    // singleton
    private static instance: QueueManager;
    public readonly queues: Map<[string, string], Queue>;   // [name, region]
    public readonly onMatchFound: SubEvent<QueuedMatch>;

    private constructor() {
        this.queues = new Map();
        this.onMatchFound = new SubEvent<QueuedMatch>();
        // make queues
        for (let blueprint of Config.queues) {
            for (let region of Config.regions) {
                // initialise every queue in every region
                let queue = new Queue(blueprint, region);
                // add the queue to the map so we can find them later
                this.queues.set([blueprint.dbname, region], queue);
                // listen for matches and emit a match when found (bundles all onMatchFound into 1)
                queue.onMatchFound.subscribe(match => {
                    this.onMatchFound.emit(match.withQueue(queue));
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
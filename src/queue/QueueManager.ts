import Config from "../Config";
import Queue from "./Queue";

export default class QueueManager {
    // singleton
    private static instance: QueueManager;
    public readonly queues: Map<[string, string], Queue>;

    private constructor() {
        this.queues = new Map();
        Config.queues.forEach(blueprint => {
            Config.regions.forEach(region => {
                // initialise every queue in every region
                let queue = new Queue(blueprint, region);
                this.queues.set([blueprint.name, region], queue);
            });
        });
    }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
}
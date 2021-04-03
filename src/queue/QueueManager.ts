import { SubEvent } from "sub-events";
import Config from "../Config";
import Match, { QueuedMatch } from "../elo/Match";
import Player from "../elo/Player";
import Pool from "./Pool";
import Queue, { QueueBlueprint } from "./Queue";
import Team from "./Team";

export default class QueueManager {
    // singleton
    // with this class we can find queues with specifying strings (poolname, region)
    // bundles all the onMatchFound events from a queue into 1
    
    private static instance: QueueManager;
    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }

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

    public addToQueue(poolname: string, region: string, team: Team) {
        let queue: Queue = this.queues[poolname][region];
        let pool: Pool = queue.pool;

        // check if the team can be added to the queue
        if (team.players.length > pool.maxPremadeSize) {
            throw new Error(`The maxmimum premade team size of this queue (${pool.maxPremadeSize}) was exceeded. Your team has ${team.players.length} members.`);
        }
        if (team.queue) {
            if (team.queue == queue) {
                throw new Error(`The team is already in this queue.`);
            } else {
                throw new Error(`The team is already in a different queue.`);
            }
        }
        for (let player of team.players) {
            if (player.queue) { // if a player is already in a queue, we can't add the team
                throw new Error(`Player ${player.id} is already in a queue!`);  // TODO: maybe players name instead?
            }
        }

        // add the team to the queue
        pool.add(team);
        team.queue = queue;
        for (let player of team.players) {
            player.queue = queue;
        }
    }

    public abortQueue(team: Team) {

    }
}

interface QueueMap {
    [key: string]: RegionMap
}

interface RegionMap {
    [key: string]: Queue
}
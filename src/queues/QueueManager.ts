import { SubEvent } from "sub-events";
import Config from "../Config";
import Match, { QueuedMatch } from "../matches/Match";
import Player from "../players/Player";
import Pool from "./Pool";
import Queue, { QueueBlueprint } from "./Queue";
import Team, { JoinConfig } from "../players/Team";
import BrawlApiWrapper from "../db/BrawlApiWrapper";

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

    public async addToSoloQueue(poolname: string, region: string, player: Player) {
        if (player.team) {
            throw new Error(`You can't solo queue if you're already in a team.`);
        }
        const soloTeam = new Team();
        soloTeam.join(player, JoinConfig.System);
        return this.addToQueue(poolname, region, soloTeam);
    }

    public async addToQueue(poolname: string, region: string, team: Team) {
        let queue: Queue = this.queues[poolname][region];
        let pool: Pool = queue.pool;

        // check if the team can be added to the queue
        if (team.players.length > pool.maxPremadeSize) {    // team too big for queue (e.g. 3 people for 2v2 or 2 people for Solo2v2)
            throw new Error(`The maxmimum premade team size of this queue (${pool.maxPremadeSize}) was exceeded. Your team has ${team.players.length} members.`);
        }
        if (team.queue) {   // Can't queue twice
            if (team.queue == queue) {
                throw new Error(`The team is already in this queue.`);
            } else {
                throw new Error(`The team is already in a different queue.`);
            }
        }
        if (team.match) {   // Can't queue if in a match
            throw new Error(`The team is already in a match.`);
        }
        
        for (let player of team.players) {
            if (player.queue) { // if a player is already in a queue, we can't add the team
                let mention = `<@${await player.getDiscordID()}>`;
                throw new Error(`${mention} is already in a queue.`);
            }
            if (player.match) { // if a player is already in a match, we can't add the team
                let name = `<@${await player.getDiscordID()}>`;
                throw new Error(`${name} is already in a match.`);
            }
        }

        // add the team to the queue
        pool.add(team); // add it to the pool
        team.queue = queue; // set the team queue
        for (let player of team.players) {  // set the queue for every player in the team
            player.queue = queue;
        }
    }

    public abortSoloQueue(player: Player) {
        if (!player.queue) {
            throw new Error("You're not even in a queue!");
        }
        player.queue.pool.remove([player]);
        player.queue = undefined;
    }

    public abortQueue(team: Team) {
        if (!team.queue) {
            throw new Error("You're not even in a queue!");
        }
        team.queue.pool.remove(team.players);  // remove players from pool
        team.queue = undefined; // unset team queue
        for (let player of team.players) {  // unset player queues
            player.queue = undefined;
        }
    }
}

interface QueueMap {
    [key: string]: RegionMap
}

interface RegionMap {
    [key: string]: Queue
}
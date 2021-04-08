import Match from "../matches/Match";
import Player from "./Player";
import Queue from "../queues/Queue";
import QueueManager from "../queues/QueueManager";

export default class Team {
    // IDEA: divide into Team and PremadeTeam extends Team
    public players: Player[];
    public host: Player | undefined;    // only the host can kick people and queue (i believe)
    private _queue: Queue | undefined;    // the team can be constructed whilst inside a specific queue.
    private _match: Match | undefined;

    constructor(host?: Player) {
        this.players = [];
        this.host = host;
        if (host) {
            this.join(host, JoinConfig.Strong);
        }
    }

    public averageElo(): number {
        let avgElo = 0;
        this.players.forEach(player => {
            avgElo += player.elo / this.players.length;
        });
        return avgElo;
    }

    public join(player: Player, config: JoinConfig = JoinConfig.Weak) {
        // lets a new player join the team if it's not already full
        // if it's not forced, it will fail and throw an error if the player is already in a team

        // first check if he is already in this team
        if (player.team == this) {
            throw new Error("Player already in this team.");
        }

        // then check if the team is even joinable
        if (this.queue) {   // we don't need to check for the maximum premade size if it is not set with a queue
            if (config == JoinConfig.Weak || config == JoinConfig.Strong) {
                if (this.players.length >= this.queue.pool.maxPremadeSize) {
                    throw new Error(`Maximum premade size is ${this.queue.pool.maxPremadeSize}. Team is full.`);
                }
            }
        }

        // now check if player is already in a different team
        if (player.team) {
            if (config == JoinConfig.Weak) {
                throw new Error(`Player is already in a different team, sure you want to leave it?`);
            } else if (config == JoinConfig.Strong) {
                player.team.kick(player);   // remove the player from the old team
            }
        }

        // everything went alright
        this.players.push(player);
        // only if the player wanted to join by himself, it will be set to be his team
        if (config != JoinConfig.System) {
            player.team = this;
        }
    }

    public kick(player: Player) {
        // if the team is in a queue, abort the queue
        let queueManager: QueueManager = QueueManager.getInstance();
        if (this.queue)
            queueManager.abortQueue(this);
        // now remove the player from the team
        const index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
        }
        player.team = undefined
        // maybe need to change the host
        if (player == this.host) {
            if (this.players.length > 0) {
                this.host = this.players[0];
            }
        }
    }

    public set queue(queue: Queue | undefined) {    // does not include them actually joining the pool
        if (queue != undefined) {
            if (!this._queue) {
                this._queue = queue;
            } else {
                throw new Error("Team is already in a queue!");
            }
        } else {
            this._queue = undefined;
        }
    }

    public get queue(): Queue | undefined {
        return this._queue;
    }

    public set match(match: Match | undefined) {
        if (match != undefined) {
            if (!this._match) {
                this._match = match;
            } else if (match != this._match) {
                throw new Error("Team is already in different a match!");
            }
        } else {
            this._match = undefined;
        }
    }

    public get match(): Match | undefined {
        return this._match;
    }
}

export enum JoinConfig {
    // Weak is for when people first try to join a team. It will ask them if they're sure they want to leave their team (if they're in one already).
    // Strong is for when people said they were sure they want to leave their current team.
    Weak,   // throw error if more players than premade and throw error if player already in team
    Strong, // throw error if more players than premade
    System  // done by the Poolsystem, no errors (actually not exactly true but at least it can get past the max premade size)
}
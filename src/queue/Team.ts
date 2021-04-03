import Player from "../elo/Player";
import Queue from "./Queue";

export default class Team {
    // IDEA: divide into Team and PremadeTeam extends Team
    public players: Player[];
    public queue: Queue | undefined;    // the team can be constructed whilst inside a specific queue.

    constructor(queue?: Queue) {
        this.players = [];
        this.queue = queue;
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
        if (config == JoinConfig.Weak) {
            if (player.team) {
                throw new Error(`Player is already in a team, sure you want to leave it?`);
            }
        }

        // everything went alright
        this.players.push(player);
    }

    public kick(player: Player) {
        const index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
        }
    }
}

export enum JoinConfig {
    // Weak is for when people first try to join a team. It will ask them if they're sure they want to leave their team (if they're in one already).
    // Strong is for when people said they were sure they want to leave their current team.
    Weak,   // throw error if more players than premade and throw error if player already in team
    Strong, // throw error if more players than premade
    System  // done by the Poolsystem, no errors (actually not exactly true but at least it can get past the max premade size)
}
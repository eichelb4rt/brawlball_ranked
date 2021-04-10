import { SubEvent } from "sub-events";
import Config from "../Config"
import Queue, { QueueBlueprint } from "../queues/Queue";
import Elo, { Score } from "../matches/Elo"
import DBManager, { DBPlayer } from "../db/DBManager";
import Team from "./Team";
import { QueuedMatch } from "../matches/Match";
import { client } from "../main";
import { User } from "discord.js";

export default class Player {
    public readonly id: string; // brawl id
    public readonly onEloChange: SubEvent<EloChangeInfo>;  // emits whenever player elo changes
    public _queue: Queue | undefined;    // Queue that the player is searching for match in
    private _match: QueuedMatch | undefined;  // Match that the player is fighting in
    public elo_map: Map<QueueBlueprint, number>;
    public _roles: Roles[];
    public team: Team | undefined;
    private _setup: boolean;    // true if everything is setup (waited for db elo and stuff)

    constructor(id: string) {
        this.id = id;
        this.elo_map = new Map();
        this._roles = [];
        this._setup = false;
        this.onEloChange = new SubEvent<EloChangeInfo>();
        this.setup();
    }

    public async setup() {
        // await player.setup() to use elo stuff
        // this can be "locked" this way because js is event-loop concurrent
        if (!this._setup) {
            await this.readRolesFromDB();
            await this.readEloFromDB();
            this._setup = true
        }
    }

    public async notify(msg_content: any) {
        // get the discord user for this player
        const db_manager = DBManager.getInstance();
        const discord_id = await db_manager.brawl_id_to_discord_id(this.id);
        const user: User | undefined = client.users.cache.get(discord_id);
        if (!user) {
            throw new Error('I do not exist. Nothing exists. We live in the matrix.');
        }
        // send a message
        try {
            await user.send(msg_content);
        } catch (e) {
            console.log(e);
        }
    }

    private async readRolesFromDB() {
        // gets the preferred roles form the db
        const db_manager = DBManager.getInstance();
        const db = await db_manager.db;
        const rows = await db.all(`SELECT * FROM Roles WHERE BrawlhallaID = ?`, [this.id]); // get entries from the db
        for (let row of rows) {
            this._roles.push(row.Role);
        }
    }

    private async updateRolesInDB() {
        // updates roles in the db
        const db_manager = DBManager.getInstance();
        const db = await db_manager.db;
        await db.run("DELETE FROM Roles WHERE BrawlhallaID = ?", [this.id]);
        for (const role of this.roles) {
            db.run("INSERT INTO Roles VALUES(?, ?)", [this.id, role]);
        }
    }

    private async readEloFromDB() {
        // gets a map of the elo for all the pools from the db
        const db_manager = DBManager.getInstance();
        const db = await db_manager.db;
        for (let blueprint of Config.queues) {
            if (await db_manager.existsTable(blueprint.dbname)) {
                let elo_rows = await db.get(`SELECT * FROM ${blueprint.dbname} WHERE BrawlhallaID = ?`, [this.id]) as DBPlayer; // get entry from the db
                let db_elo = Config.eloOnStart  // initiate elo
                if (elo_rows) {    // if there is an entry, read it
                    db_elo = elo_rows.Elo;
                }
                this.elo_map.set(blueprint, db_elo);
            }
        }
    }

    private async updateEloInDB(queue: Queue) {
        // updates the elo in the db (only for the given queue)
        const dbManager: DBManager = DBManager.getInstance();
        const db = await dbManager.db;
        // make sure table name exists to prevent SQL Injections
        if (await dbManager.existsTable(queue.dbname)) {
            // search for player in queue db
            let result = await db.get(`SELECT * FROM ${queue.dbname} WHERE BrawlhallaID = ?`, [this.id]) as DBPlayer;  // player.id is Brawlhalla ID
            // check if they were found
            if (!result) {
                // add player to db if they don't already exist
                await db.run(`INSERT INTO ${queue.dbname} VALUES(?,?)`, [this.id, this.getEloInQueue(queue.blueprint)]);
            } else {
                // update elo if they do already exist
                await db.run(`UPDATE ${queue.dbname} SET Elo = ? WHERE BrawlhallaID = ?`, [this.getEloInQueue(queue.blueprint), this.id]);
            }
        } else {
            throw new Error("This queue does not exist");
        }
    }

    public getEloInQueue(queue: QueueBlueprint): number {
        // figure out in which queue we want to set the elo
        const elo = this.elo_map.get(queue);
        if (elo)
            return elo;
        return Config.eloOnStart;
    }

    public get roles(): Roles[] {
        return this._roles;
    }

    public set roles(roles: Roles[]) {
        this._roles = roles;
        this.updateRolesInDB();
    }

    public get elo(): number {
        // figure out in which queue we want to set the elo
        let queue: Queue | undefined = undefined;
        if (this.match)
            queue = this.match.queue;
        else if (this.queue)
            queue = this.queue;
        // get the elo
        if (queue)
            return this.getEloInQueue(queue.blueprint);
        return Config.eloOnStart;
    }

    public set elo(elo: number) {
        // figure out in which queue we want to set the elo
        let queue: Queue | undefined = undefined;
        if (this.match) {
            queue = this.match.queue;
        } else if (this.queue) {
            queue = this.queue;
        }
        // set the elo
        if (queue) {
            let oldElo = this.elo_map.get(queue.blueprint);
            if (!oldElo)
                oldElo = Config.eloOnStart;
            this.elo_map.set(queue.blueprint, elo);
            this.updateEloInDB(queue);
            const elo_change_info: EloChangeInfo = {
                queue_name: queue.blueprint.displayName,
                old_elo: oldElo,
                new_elo: elo,
                elo_diff: elo - oldElo,
            }
            this.onEloChange.emit(elo_change_info);
        }
    }

    public set queue(queue: Queue | undefined) {    // does not include them actually joining the pool
        if (queue != undefined) {
            if (!this._queue) {
                this._queue = queue;
            } else {
                throw new Error("Player is already in a queue!");
            }
        } else {
            this._queue = undefined;
        }
    }

    public get queue(): Queue | undefined {
        return this._queue;
    }

    public set match(match: QueuedMatch | undefined) {
        if (match != undefined) {
            if (!this._match) {
                this._match = match;
            } else {
                throw new Error("Player is already in a match!");
            }
        } else {
            this._match = undefined;
        }
    }

    public get match(): QueuedMatch | undefined {
        return this._match;
    }

    public toString(): string {
        let to_string = `${this.id}:`;
        for (let blueprint of this.elo_map.keys()) {
            to_string = to_string.concat(`\t${blueprint.displayName}:\t${this.getEloInQueue(blueprint)} (${this.getRank(blueprint)})`);
        }
        return to_string;
    }

    public getK(score: Score) {
        // K-Factor, used to determine the weight of a win or a loss (or a draw) depending on the elo
        switch (score) {
            case Score.Win: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnWin, Config.upperBoundKOnWin, this.elo);
            case Score.Loss: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnLoss, Config.upperBoundKOnLoss, this.elo);
            case Score.Draw: return Elo.linearFunction(Config.lowerBoundElo, Config.upperBoundElo, Config.lowerBoundKOnDraw, Config.upperBoundKOnDraw, this.elo);
        }
    }

    public getRank(blueprint: QueueBlueprint): string {
        const elo = this.getEloInQueue(blueprint);
        return Elo.elo_to_rank(elo);
    }

    public async getDiscordID(): Promise<string> {
        const db = await DBManager.getInstance().db;
        const discord_id_row = await db.get("SELECT * FROM Users WHERE BrawlhallaID = ?", [this.id]);
        if (!discord_id_row)
            throw new Error(`Player with Brawlhalla id ${this.id} not found.`);
        return discord_id_row.DiscordID;
    }
}

export interface Rank {
    name: string;
    start: number;
}

export interface EloChangeInfo {
    queue_name: string;
    old_elo: number;
    new_elo: number;
    elo_diff: number;
}

export enum Roles {
    Runner = "Runner",
    Support = "Support",
    Defense = "Defense"
}
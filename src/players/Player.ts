import { SubEvent } from "sub-events";
import Config from "../Config"
import Queue from "../queues/Queue";
import Elo, { Score } from "../matches/Elo"
import DBManager, { DBPlayer } from "../db/DBManager";
import Team from "./Team";
import { QueuedMatch } from "../matches/Match";
import { client } from "../main";
import { MessageEmbed, User } from "discord.js";
import Role from "./Role";

/**
 * Caches a player with an id .
 */
export default class Player {
    public readonly id: string; // brawl id
    // === STORED IN DB ===
    // discord id
    public discord_id: string | undefined;
    // map from db elo pool name to elo in that pool (e.g. team2v2 -> 1800)
    public elo_map: Map<string, number>;
    public _roles: Role[];
    //  === TEMPORARY ===
    public _queue: Queue | undefined;    // Queue that the player is searching for match in
    private _match: QueuedMatch | undefined;  // Match that the player is fighting in
    public team: Team | undefined;

    private constructor(id: string) {
        this.id = id;
        this.elo_map = new Map();
        this._roles = [];
    }

    // === READ OPERATIONS ===

    /**
     * Retrieves a new player cache from the db.
     * @param id The id of the searched player.
     */
    public async get(id: string): Promise<Player> {
        let player = new Player(id);
        await player.read_discord_id();
        await player.read_elo();
        await player.read_roles();
        return player;
    }

    private async read_discord_id() {
        const db = await DBManager.getInstance().db;
        const discord_id_row = await db.get("SELECT * FROM Users WHERE BrawlhallaID = ?", [this.id]);
        if (!discord_id_row)
            throw new Error(`Player with Brawlhalla id ${this.id} not found.`);
        this.discord_id = discord_id_row.DiscordID;
    }

    private async read_elo() {
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
                this.elo_map.set(blueprint.dbname, db_elo);
            }
        }
    }

    private async read_roles() {
        // gets the preferred roles form the db
        let roles = [];
        const db_manager = DBManager.getInstance();
        const db = await db_manager.db;
        const rows = await db.all(`SELECT * FROM Roles WHERE BrawlhallaID = ?`, [this.id]); // get entries from the db
        for (let row of rows) {
            // find role corresponding to dbname
            for (const role of Config.roles) {
                if (role.db_name === row.Role) {
                    roles.push(role);
                }
            }
        }
        this._roles = roles;
    }

    // === WRITE OPERATIONS ===

    /**
     * Writes all the cached information back to the db.
     */
    public async write_out() {
        await this.write_discord_id();
        await this.write_elo();
        await this.write_roles();
    }

    private async write_discord_id() {
        const db = await DBManager.getInstance().db;
        await db.get("UPDATE Users SET DiscordID = ? WHERE BrawlhallaID = ?", [this.discord_id, this.id]);
    }

    private async write_elo() {
        for (const pool of this.elo_map.keys()) {
            await this.write_specific_elo(pool);
        }
    }

    private async write_roles() {
        // updates roles in the db
        const db = await DBManager.getInstance().db;
        await db.run("DELETE FROM Roles WHERE BrawlhallaID = ?", [this.id]);
        for (const role of this.roles) {
            db.run("INSERT INTO Roles VALUES(?, ?)", [this.id, role.db_name]);
        }
    }

    private async write_specific_elo(pool: string) {
        // updates the elo in the db (only for the given queue)
        const db_manager: DBManager = DBManager.getInstance();
        const db = await db_manager.db;
        // make sure table name exists to prevent SQL Injections
        if (await db_manager.existsTable(pool)) {
            // search for player in queue db
            let result = await db.get(`SELECT * FROM ${pool} WHERE BrawlhallaID = ?`, [this.id]) as DBPlayer;  // player.id is Brawlhalla ID
            // check if they were found
            if (!result) {
                // add player to db if they don't already exist
                await db.run(`INSERT INTO ${pool} VALUES(?,?)`, [this.id, this.elo_map.get(pool)]);
            } else {
                // update elo if they do already exist
                await db.run(`UPDATE ${pool} SET Elo = ? WHERE BrawlhallaID = ?`, [this.elo_map.get(pool), this.id]);
            }
        } else {
            throw new Error("This queue does not exist");
        }
    }

    // === GETTERS AND SETTERS ===

    public get_specific_elo(pool_dbname: string): number {
        // figure out in which queue we want to set the elo
        const elo = this.elo_map.get(pool_dbname);
        if (elo)
            return elo;
        return Config.eloOnStart;
    }

    public get roles(): Role[] {
        if (this._roles.length === 0) {
            return Config.roles;    // if no roles are assigned, assign all the roles (if player isn't good at any role in particular, they're mediocre in everything)
        }
        return this._roles;
    }

    public set roles(roles: Role[]) {
        this._roles = roles;
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
            return this.get_specific_elo(queue.dbname);
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
            let oldElo = this.elo_map.get(queue.dbname);
            if (!oldElo)
                oldElo = Config.eloOnStart;
            this.elo_map.set(queue.dbname, elo);
            this.notify(this.onEloChangeEmbed(queue.displayName, oldElo, elo))
                .catch(err => console.log(`Could not message player with id ${this.id}.`));
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

    // === MISC ===

    private onEloChangeEmbed(queue_name: string, old_elo: number, new_elo: number): MessageEmbed {
        const elo_diff_value = new_elo - old_elo;
        const elo_diff_str: string = elo_diff_value >= 0 ? `+${elo_diff_value}` : `${elo_diff_value}`;
        const embed = new MessageEmbed()
            .setTitle('Your elo changed')
            .setColor(Config.embed_colour)
            .addField('Old Elo', `${old_elo} (${Elo.elo_to_rank(old_elo)})`, true)
            .addField('New Elo', `${new_elo} (${Elo.elo_to_rank(new_elo)}) (${elo_diff_str})`, true);
        if (Elo.elo_to_rank(old_elo) != Elo.elo_to_rank(new_elo)) {
            const description = elo_diff_value > 0 ? "You ranked up!" : "You downranked.";
            embed.setDescription(description);
        }
        return embed;
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

    public toString(): string {
        let to_string = `${this.id}:`;
        for (const pool of this.elo_map.keys()) {
            const elo = this.elo_map.get(pool)!;
            to_string = to_string.concat(`\t${pool}:\t${elo} (${Elo.elo_to_rank(elo)})`);
        }
        return to_string;
    }

    public mention(): string {
        return `<@${this.discord_id}>`;
    }
}
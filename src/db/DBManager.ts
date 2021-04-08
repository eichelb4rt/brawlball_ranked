import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'

export default class DBManager {
    // Singleton
    private static instance: DBManager;
    // open db and specify file location and so on
    public readonly db: Promise<Database<sqlite3.Database, sqlite3.Statement>>

    private constructor() {
        this.db = open({
            filename: './src/db/elo.db',
            driver: sqlite3.cached.Database
        });
    }

    public static getInstance(): DBManager {
        if (!DBManager.instance) {
            DBManager.instance = new DBManager;
        }
        return DBManager.instance;
    }

    public async existsTable(table: string): Promise<boolean> {
        const result = await (await this.db).get("SELECT 1 FROM sqlite_master WHERE type='table' and name = ?", table) as number // get 1 if table name exists
        // undefined if not found
        if (result)
            return true;
        return false;
    }

    public async discord_id_to_brawl_id(discord_id: string): Promise<string> {
        const db = await this.db;
        const brawlId_row = await db.get("SELECT * FROM Users WHERE DiscordID = ?", [discord_id]);
        if (brawlId_row)
            return brawlId_row.BrawlhallaID;
        throw new Error(`There is no Brawlhalla account linked to <@${discord_id}>. To do that, type \`!link \{your Brawlhalla ID\}\``);
    }
}

export interface DBPlayer {
    BrawlhallaID: string,
    Elo: number
}
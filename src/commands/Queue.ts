import { Message } from "discord.js"
import Player from "../players/Player";
import PublicCommand from "../interfaces/PublicCommand";
import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import Axios from "axios"
import {
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from "axios"
import DBManager from "../db/DBManager";
import Config from "../Config";
import Tokens from "../keys"

export default class Queue extends PublicCommand {
    invokeStr: string = "!queue";
    description: string = "queue in a region.";
    help: string = "!queue (details not worked out yet)";

    action(msg: Message): void {
        msg.channel.send("Pong.");
    }

    async queue(DiscordID: string, queue: string, region: string) {

        const db: Database<sqlite3.Database, sqlite3.Statement> = await DBManager.getInstance().db;
        let BrawlID = db.get("SELECT BrawlhallaID FROM Users WHERE DiscordID = ?", DiscordID);
        let name = "TODO";  // get the Brawlhalla name
        await Axios.get(`${Config.BrawlAPI}/player/${BrawlID}/stats`, {
            params: {
                api_key: Tokens.brawlhalla
            }
        })
    }
}
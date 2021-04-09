import { MessageEmbed } from "discord.js";
import Config from "../Config";
import Elo from "../matches/Elo";
import Player, { EloChangeInfo } from "./Player";

export default class PlayerCache {
    // keeps players in memory instead of always reading from the db
    // players need to stay in memory because we want to know if they may already be in a queue which is data that i don't want to store in a db
    // atm it still caches every player until the end of time. This can be optimised and maybe rewritten as an interface.

    public static instance: PlayerCache
    public static getInstance(): PlayerCache {
        if (!this.instance) {
            this.instance = new this();
        }
        return this.instance;
    }

    private cache: Map<string, Player>

    private constructor() {
        this.cache = new Map()
    }

    // gets a Player from the cache. If not cached, creates a new one from the DB.
    public getPlayer(id: string): Player {
        // look in the map if there is already a player with this id
        let player: Player | undefined = this.cache.get(id)
        if (!player) {   // if not, make a new player with the id and cache it
            player = new Player(id);
            this.cache.set(id, player)
        }
        player.onEloChange.subscribe(info => {
            try {
                player!.notify(this.onEloChangeEmbed(info));
            } catch (e) {
                // if we can't notify them because they're not cached, that's ok.
            }
        });
        return player
    }

    private onEloChangeEmbed(info: EloChangeInfo): MessageEmbed {
        const elo_diff: string = info.elo_diff > 0 ? `+${info.elo_diff}` : `${info.elo_diff}`;
        const embed = new MessageEmbed()
            .setTitle('Your elo changed')
            .setColor(Config.embed_colour)
            .addField('Old Elo', `${info.old_elo} (${Elo.elo_to_rank(info.old_elo)})`, true)
            .addField('New Elo', `${info.new_elo} (${Elo.elo_to_rank(info.old_elo)}) (${elo_diff})`, true);
        if (Elo.elo_to_rank(info.old_elo) != Elo.elo_to_rank(info.new_elo)) {
            const description = info.elo_diff > 0 ? "You ranked up!" : "You downranked.";
            embed.setDescription(description);
        }
        return embed;
    }
}
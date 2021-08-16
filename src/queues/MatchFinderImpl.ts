import Player from "../players/Player";
import MatchFinder from "./MatchFinder";
import MatchEvaluator from "./MatchEvaluator";
import LinkedList, { LinkedListNode } from "../datastructures/LinkedList";
import MinHeap from "../datastructures/MinHeap";
import MatchFilter from "./MatchFilter";
import MappedMinHeap from "../datastructures/MappedMinHeap";

/**
 * Implementation of a MatchMaking Datastructure.
 * 
 * based on [Theoretical Foundations of Team Matchmaking](http://www.ifaamas.org/Proceedings/aamas2017/pdfs/p1073.pdf)
 */
export default class MatchFinderPaperImpl implements MatchFinder {
    private player_list: LinkedList<PlayerEntry> = new LinkedList();
    private match_evaluator: MatchEvaluator;
    private match_filter: MatchFilter;
    // best game (Player[][]) where the index player (Player) is the worst
    private best_games: MappedMinHeap<Player, Player[][] | undefined>;
    private readonly config: MatchFinderPaperConfig;
    private readonly relevant_player_radius: number;

    constructor(match_evaluator: MatchEvaluator, match_filter: MatchFilter, config: MatchFinderPaperConfig) {
        this.match_evaluator = match_evaluator;
        this.match_filter = match_filter;
        this.config = config;
        this.best_games = new MappedMinHeap(match_evaluator.heap_order);
        this.relevant_player_radius = 4 * (1 + this.config.ALPHA) * Math.pow(this.config.MAX_TEAM_SIZE, 1 + 1 / this.config.Q);
    }

    public async add(players: Player[]): Promise<void> {
        // nodes that have been added by this function
        const added_nodes: Set<LinkedListNode<PlayerEntry>> = new Set();
        for (const player of players) {
            const node = this.insert_player(player);
            added_nodes.add(node);
        }

        // nodes that need to be updated
        const hot_nodes: Set<LinkedListNode<PlayerEntry>> = new Set();
        for (const added_node of added_nodes) {
            // added node itself
            hot_nodes.add(added_node);
            // relevant nodes before it
            for (const hot_node of this.player_list.walk_backward(added_node, this.relevant_player_radius)) {
                hot_nodes.add(hot_node);
            }
        }

        await this.update_hot_nodes(hot_nodes);
    }

    public async remove(players: Player[]) {
        // nodes that have been rremoved by this function
        const removed_nodes: Set<LinkedListNode<PlayerEntry>> = new Set();
        // set so that checks of node removal are faster
        const removed_players_set: Set<Player> = new Set(players);
        for (const node of this.player_list.get_nodes()) {
            if (removed_players_set.has(node.value.player)) {
                removed_nodes.add(node);
                // to see if the set is empty after
                removed_players_set.delete(node.value.player);
            }
        }
        // if "removed_players_set" is not empty by now, someone was not in the queue
        if (removed_players_set.size !== 0) {
            throw RangeError("At least 1 player in this group is not in the queue.");
        }

        // nodes that need to be updated
        const hot_nodes: Set<LinkedListNode<PlayerEntry>> = new Set();
        for (const removed_node of removed_nodes) {
            for (const hot_node of this.player_list.walk_backward(removed_node, this.relevant_player_radius)) {
                hot_nodes.add(hot_node);
            }
        }

        // now finally remove the stuff
        for (const removed_node of removed_nodes) {
            // we don't need to update the removed nodes
            hot_nodes.delete(removed_node);
            // remove all the nodes from the list
            this.player_list.remove(removed_node);
        }
        // also remove the players from the best matches heap
        for (const player of players) {
            this.best_games.delete(player);
        }

        await this.update_hot_nodes(hot_nodes);
    }

    public async extract_match(): Promise<Player[][] | undefined> {
        const match = this.best_games.root;
        if (match === undefined) {
            return undefined;
        }
        // remove all the players
        const players: Player[] = [];
        for (const team of match) {
            for (const player of team) {
                players.push(player);
            }
        }
        this.remove(players);
        return match;
    }

    /**
     * Finds the spot that a new player will be inserted in and inserts the üöayer.
     * @param player The player that will be inserted.
     * @returns The newly created node with the player.
     */
     private insert_player(player: Player): LinkedListNode<PlayerEntry> {
        let entry = new PlayerEntry(player, this.match_evaluator);
        for (const node of this.player_list.get_nodes()) {
            let list_player = node.value.player;
            if (player.elo >= list_player.elo) {
                return this.player_list.insert_before(node, entry);
            }
        }
        return this.player_list.add(entry);
    }

    private async update_hot_nodes(hot_nodes: Set<LinkedListNode<PlayerEntry>>) {
        // update all the possible matches in parallel
        let promises: Promise<void>[] = new Array(hot_nodes.size);
        let i = 0;
        for (const hot_node of hot_nodes) {
            promises[i] = this.update_possible_matches(hot_node);
        }
        await Promise.all(promises);

        // update all the best matches
        for (const hot_node of hot_nodes) {
            const player_entry = hot_node.value;
            const best_match = player_entry.possible_games.root;
            this.best_games.set(player_entry.player, best_match);
        }
    }

    /**
     * Updates all the possible matches where the player in the node is the worst.
     * @param node The node containing the player entry to be updated.
     */
    private async update_possible_matches(node: LinkedListNode<PlayerEntry>): Promise<void> {
        const player_entry = node.value;
        // reset the heap
        player_entry.empty_heap();
        // we will not consider any players outside of the radius:
        let end: LinkedListNode<PlayerEntry> | undefined = this.player_list.scroll(node, this.relevant_player_radius);
        // select a collection of 2k - 1 players that are better than this player
        for (let players of this.choose_players(2 * this.config.MAX_TEAM_SIZE - 1, node, end)) {
            // add this player (because they have to be in the game as well)
            players.push(player_entry.player);
            // select a team 1 and put team 2 as everyone who is not in team 1
            for (const team_1 of choose(this.config.MAX_TEAM_SIZE, players)) {
                const team_2 = players.filter(player => !team_1.includes(player));
                // if the so constructed match passes through the filter, insert it into the possible games
                const match = [team_1, team_2];
                if (this.match_filter.test(match)) {
                    player_entry.possible_games.insert(match);
                }
            }
        }
    }

    private *choose_players(n: number, from: LinkedListNode<PlayerEntry> | undefined, end: LinkedListNode<PlayerEntry> | undefined = undefined): Generator<Player[], void, void> {
        if (n === 0) yield [];
        for (const node of this.player_list.get_nodes(from, end)) {
            const player = node.value.player;
            for (const rest of this.choose_players(n - 1, node.next, end)) {
                yield rest.concat([player]);
            }
        }
    }
}

class PlayerEntry {
    public readonly player: Player;
    private readonly match_evaluator: MatchEvaluator;
    // undefined is actually not possible in "possible_games". it's just more convenient so we can use the standard match evaluator that also takes undefined.
    public possible_games!: MinHeap<Player[][] | undefined>;

    constructor(player: Player, match_evaluator: MatchEvaluator) {
        this.player = player;
        this.match_evaluator = match_evaluator;
        this.empty_heap();
    }

    public empty_heap() {
        this.possible_games = new MinHeap(this.match_evaluator.heap_order);
    }
}

function* choose<T>(n: number, arr: T[], from: number = 0): Generator<T[], void, void> {
    if (n === 0) yield [];
    for (let i = from; i < arr.length; ++i) {
        for (const rest of choose(n - 1, arr, i + 1)) {
            yield rest.concat([arr[i]]);
        }
    }
}

export interface MatchFinderPaperConfig {
    readonly P: number;
    readonly Q: number;
    readonly ALPHA: number;
    readonly MAX_TEAM_SIZE: number;
}
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
    // linked list of all the players and their possible matches
    private player_list: LinkedList<PlayerEntry> = new LinkedList();
    // best game (Player[][]) where the index player (Player) is the worst
    private best_games: MappedMinHeap<Player, Player[][]>;
    private readonly match_evaluator: MatchEvaluator;
    private readonly match_filter: MatchFilter;
    private readonly config: MatchFinderPaperConfig;
    private readonly relevant_player_radius: number;

    constructor(match_evaluator: MatchEvaluator, match_filter: MatchFilter, config: MatchFinderPaperConfig) {
        this.match_evaluator = match_evaluator;
        this.match_filter = match_filter;
        this.config = config;
        this.best_games = new MappedMinHeap(match_evaluator.heap_order.bind(match_evaluator));
        this.relevant_player_radius = 4 * (1 + this.config.ALPHA) * Math.pow(this.config.MAX_TEAM_SIZE, 1 + 1 / this.config.Q);
    }

    public add(players: Player[]) {
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
            for (const hot_node of this.player_list.walk(added_node, -this.relevant_player_radius)) {
                hot_nodes.add(hot_node);
            }
        }

        // update
        this.update_hot_nodes(hot_nodes);
    }

    public remove(players: Player[]) {
        // figure out which nodes will be removed by this function
        const nodes_to_remove: Set<LinkedListNode<PlayerEntry>> = new Set();
        // set so that checks of node removal are faster
        const check_set: Set<Player> = new Set(players);
        for (const node of this.player_list.walk()) {
            if (check_set.has(node.value.player)) {
                nodes_to_remove.add(node);
                // to see if the set is empty after
                check_set.delete(node.value.player);
            }
        }
        // if "removed_players_set" is not empty by now, someone was not in the queue
        if (check_set.size !== 0) {
            throw RangeError("At least 1 player in this group is not in the queue.");
        }

        // find nodes that need to be updated
        const hot_nodes: Set<LinkedListNode<PlayerEntry>> = new Set();
        for (const removed_node of nodes_to_remove) {
            for (const hot_node of this.player_list.walk(removed_node, -this.relevant_player_radius)) {
                hot_nodes.add(hot_node);
            }
        }
        // we don't need to update the removed nodes
        for (const removed_node of nodes_to_remove) {
            hot_nodes.delete(removed_node);
        }

        // now finally remove the players from the player list
        for (const removed_node of nodes_to_remove) {
            this.player_list.remove(removed_node);
        }

        // also remove the players from the best matches heap
        for (const player of players) {
            try {
                this.best_games.delete(player);
            } catch (e) {
                // that's fine, some players weren't even added because they have no legal matches
            }
        }

        // update
        this.update_hot_nodes(hot_nodes);
    }

    public extract_match(): Player[][] | undefined {
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
     * Finds the spot that a new player will be inserted in and inserts the Player.
     * @param player The player that will be inserted.
     * @returns The newly created node with the player.
     */
    private insert_player(player: Player): LinkedListNode<PlayerEntry> {
        let entry = new PlayerEntry(player, this.match_evaluator);
        for (const node of this.player_list.walk()) {
            let list_player = node.value.player;
            if (player.elo >= list_player.elo) {
                return this.player_list.insert_before(node, entry);
            }
        }
        return this.player_list.add(entry);
    }

    /**
     * Updates the possible matches and the best match for the hot nodes.
     * @param hot_nodes all the nodes that need to be updated.
     */
    private update_hot_nodes(hot_nodes: Set<LinkedListNode<PlayerEntry>>) {
        for (const hot_node of hot_nodes) {
            this.update_possible_matches(hot_node);
        }

        // update all the best matches
        for (const hot_node of hot_nodes) {
            const { player, possible_games } = hot_node.value;
            const best_match = possible_games.root;
            if (best_match !== undefined) {
                // if the match is not undefined, set it
                this.best_games.set(player, best_match);
            } else if (this.best_games.has_index(player)) {
                // if the match is undefined but it wasn't undefined before, delete it.
                this.best_games.delete(player);
            }
        }
    }

    /**
     * Updates all the possible matches where the player in the node is the worst.
     * @param node The node containing the player entry to be updated.
     */
    private update_possible_matches(node: LinkedListNode<PlayerEntry>) {
        const player_entry = node.value;
        // reset the heap
        player_entry.empty_heap();
        // we will not consider any players outside of the radius:
        let end: LinkedListNode<PlayerEntry> | undefined = this.player_list.jump(node, this.relevant_player_radius);
        // select a collection of 2k - 1 players that are better than this player
        for (let players of this.choose_players(2 * this.config.MAX_TEAM_SIZE - 1, node.next, end)) {
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

    /**
     * Chooses n players from [from,end).
     * @param n The number of players in the selection.
     * @param from First node included in the selection.
     * @param end First node excluded from the selection.
     * @yields Every possible selection of n players from [from, end).
     */
    private *choose_players(n: number, from: LinkedListNode<PlayerEntry> | undefined, end: LinkedListNode<PlayerEntry> | undefined = undefined): Generator<Player[], void, void> {
        if (n === 0) yield [];
        if (from === undefined) return;
        for (const node of this.player_list.nodes_between(from, end)) {
            const player = node.value.player;
            for (const rest of this.choose_players(n - 1, node.next, end)) {
                yield rest.concat([player]);
            }
        }
    }
}

/**
 * Chooses n objects from a given array.
 * @param n The number of selected objects.
 * @param arr The array that the objects are chosen from.
 * @param from Only elements after this index (inclusive) are considered.
 * @yields Every possible selection of n players in the array.
 */
function* choose<T>(n: number, arr: T[], from: number = 0): Generator<T[], void, void> {
    if (n === 0) yield [];
    for (let i = from; i < arr.length; ++i) {
        for (const rest of choose(n - 1, arr, i + 1)) {
            yield rest.concat([arr[i]]);
        }
    }
}

/**
 * Entries of the player list in the match finding datastructure above.
 */
class PlayerEntry {
    public readonly player: Player;
    private readonly match_evaluator: MatchEvaluator;
    // undefined is actually not possible in "possible_games". it's just more convenient so we can use the standard match evaluator that also takes undefined.
    public possible_games!: MinHeap<Player[][]>;

    constructor(player: Player, match_evaluator: MatchEvaluator) {
        this.player = player;
        this.match_evaluator = match_evaluator;
        this.empty_heap();
    }

    public empty_heap() {
        this.possible_games = new MinHeap(this.match_evaluator.heap_order.bind(this.match_evaluator));
    }
}

export interface MatchFinderPaperConfig {
    readonly P: number;
    readonly Q: number;
    readonly ALPHA: number;
    readonly MAX_TEAM_SIZE: number;
}
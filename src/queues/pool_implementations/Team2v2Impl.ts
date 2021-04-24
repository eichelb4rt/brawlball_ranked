import Match, { Teams } from "../../matches/Match";
import Player from "../../players/Player";
import Pool from "../Pool";
import Team, { JoinConfig } from "../../players/Team";
import PoolSystem from "../PoolSystem";
import MinHeap, { HeapIndexable, MinHeapThatStoresIndexInObjects } from "../MinHeap";
import Elo, { Score } from "../../matches/Elo";

export default class Team2v2Impl extends Pool {
    static readonly poolSystem = PoolSystem.Team2v2;
    readonly maxPremadeSize = 2;
    readonly maxTeamSize = 2;

    // every player has a MinHeap for the possible games where they are the worst player.
    // these heaps are stored in the exact order that the players are stored in
    // the root of these heaps are the best of these possible games
    // they are stored in another array, inside a structure that makes them easily accessible in a heap
    // these structures are stored in a MinHeap to find the best possible game overall
    private players: Player[];
    private possible_games_heaps: MinHeap<Player[]>[];
    private best_games: HeapIndexable<Player[]>[];
    private best_games_heap: MinHeapThatStoresIndexInObjects<Player[], HeapIndexable<Player[]>>;
    private readonly min_fairness = 20;

    private readonly p = 2; // p parameter for team matchmaking algorithm
    private readonly q = 2; // q parameter for team matchmaking
    private readonly alpha = 1  // alpha parameter for team matchmaking

    private readonly best_game_range = 4 * (1 + this.alpha) * Math.pow(this.maxTeamSize, 1 + 1 / this.q);

    constructor() {
        super();
        this.players = [];
        this.possible_games_heaps = [];
        this.best_games = [];
        this.best_games_heap = new MinHeapThatStoresIndexInObjects((a, b) => this.heap_order(a, b, this));
    }

    async add(team: Team): Promise<void> {
        // adds players
        for (const player of team.players) {
            // position at which the new player will be
            const pos = this.player_pos(player);
            // insert player into player array
            this.players.splice(pos, 0, player);
            // initialise the possible games
            this.possible_games_heaps.splice(pos, 0, new MinHeap<Player[]>((a, b) => this.heap_order(a, b, this)));
            // get all the possible games for that guy
            this.update_possible_matches(pos);
            // insert the best possible game into the best games array (heap index gets initialised with 0)
            const best_game = this.possible_games_heaps[pos].root;
            this.best_games.splice(pos, 0, { data: best_game, heap_index: 0 });
            // insert the best game for the new player into the best games heap
            const best_game_wrapper = this.best_games[pos];
            this.best_games_heap.insert(best_game_wrapper);
            // update possible games, best games, and the best games heap for all the players that might have been affected by that insertion
            this.update(pos);
        }
    }

    async remove(players: Player[]): Promise<void> {
        // should remove every team that contains the players passed as argument
        for (const player of players) {
            // find the player
            const pos = this.find_player(player);
            if (pos === -1) {
                continue;   // if we didn't find the player, just continue with the next one
            }
            // ok we found the player.
            // remove player from player array
            this.players.splice(pos, 1);
            // remove the possible games
            this.possible_games_heaps.splice(pos, 1);
            // remove the best possible game from the best games array and best games heap
            const best_game = this.best_games[pos];
            this.best_games.splice(pos, 1);
            this.best_games_heap.delete(best_game.heap_index);
            // update possible games, best games, and the best games heap for all the players that might have been affected by that insertion
            this.update(pos);
        }
    }

    async *getMatches(): AsyncGenerator<Match, void, void> {
        let match = await this.getMatch();
        while (match) {
            this.remove(match.players);
            yield match;
            match = await this.getMatch();
        }
    }

    async getMatch(): Promise<Match | undefined> {
        const players = this.best_games_heap.root;
        if (!players) {
            return undefined;
        }
        // put the first half in team a
        let teamA: Team = new Team();
        for (let i = 0; i < this.maxTeamSize; i++) {
            teamA.join(players[i], JoinConfig.System);
        }
        // put the second half in team b
        let teamB: Team = new Team();
        for (let i = this.maxTeamSize; i < 2 * this.maxTeamSize; i++) {
            teamB.join(players[i], JoinConfig.System);
        }
        // remove players from pool and return the found match
        return new Match(teamA, teamB);
    }

    private find_player(player: Player): number {
        let pos = this.binary_search(player.elo);
        if (pos === -1) {
            return -1;
        }
        // now because there can be multiple players with the same elo, we have to search for the right player.
        // first go to the start of the players with the same elo
        for (pos; pos >= 0; --pos) {
            if (this.players[pos].elo !== player.elo) {
                break;
            }
        }
        // pos is now 1 before the first player with the same elo
        for (let i = pos + 1; pos < this.players.length - 1 && this.players[i].elo === player.elo; ++i) {
            if (this.players[i].id === player.id) {
                return i
            }
        }
        return -1;
    }

    private binary_search(elo: number): number {
        // searches for a player with the specified elo and returns index
        let l = 0;
        let r = this.players.length - 1;
        while (l <= r) {
            const m = Math.floor((l + r) / 2);
            if (this.players[m].elo < elo) {
                l = m + 1;
            } else if (this.players[m].elo > elo) {
                r = m - 1;
            } else {
                return m
            }
        }
        return -1;
    }

    private heap_order(match_a: Player[] | undefined, match_b: Player[] | undefined, self: this = this): number {
        // orders matches
        let score_a: number;
        if (match_a) {
            // first k players are team_1, last k players are team 2
            const team_1 = match_a.slice(0, this.maxTeamSize - 1);
            const team_2 = match_a.slice(this.maxTeamSize, 2 * this.maxTeamSize - 1);
            // calc imbalance
            score_a = self.imbalance_function(team_1, team_2);
        } else {
            score_a = Number.POSITIVE_INFINITY;
        }
        // same for "match" b
        let score_b: number;
        if (match_b) {
            // first k players are team_1, last k players are team 2
            const team_1 = match_b.slice(0, this.maxTeamSize - 1);
            const team_2 = match_b.slice(this.maxTeamSize, 2 * this.maxTeamSize - 1);
            // calc imbalance
            score_b = self.imbalance_function(team_1, team_2);
        } else {
            score_b = Number.POSITIVE_INFINITY;
        }
        // compare imbalances
        if (score_a > score_b) return 1;
        if (score_a < score_b) return -1;
        return 0;
    }

    private update(index: number) {
        // updates all the possible funny matches when index was changed
        for (let i = index - 1; i >= 0 && i >= index - this.best_game_range; --i) {
            // iterate backwards through our funny array until either the start or until just outside the range where the best games can be found
            this.update_player(i);
        }
    }

    private update_player(index: number) {
        this.update_possible_matches(index);
        this.update_best_games(index);
    }

    private update_best_games(index: number) {
        // update the new best match (data changed in best games heap => data changed in best games array, since it only stores references)
        const new_best_match: Player[] = this.possible_games_heaps[index].root;
        const best_match_wrapper: HeapIndexable<Player[]> | null = this.best_games[index];
        best_match_wrapper.data = new_best_match;
        this.best_games_heap.change_value(best_match_wrapper.heap_index, new_best_match);
    }

    private update_possible_matches(index: number) {
        // the player we want to update
        const indexed_player = this.players[index];
        // update the best possible matches where the player at the given index is the worst player
        const first_index = index + 1;
        const last_index = index + this.best_game_range;
        // we only consider the players in a constant range for the best match possible with indexed player as the worst
        const considered_players = this.players.slice(first_index, last_index);
        const new_heap = new MinHeap<Player[]>((a, b) => this.heap_order(a, b, this));
        this.possible_games_heaps[index] = new_heap;
        // insert all of the possible games into a funny heap
        for (const rest_players of choose(2 * this.maxTeamSize - 1, considered_players)) {
            // select a collection of players 2k - 1 players, that are better than our player at index
            const players = rest_players.concat([indexed_player]);
            for (const team_a of choose(this.maxTeamSize, players)) {
                // select a team a and put team b as everyone who is not in team a
                const team_b = players.filter(player => !team_a.includes(player));
                // insert it into the heap
                new_heap.insert(team_a.concat(team_b));
            }
        }
    }

    private player_pos(player: Player): number {
        let low = 0,
            high = this.players.length;

        while (low < high) {
            let mid = (low + high) >>> 1;
            if (this.players[mid].elo < player.elo) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    public team_skill(players: Player[]): number {
        let sum = 0;
        for (const player of players) {
            sum += Math.pow(player.elo, this.p);
        }
        return Math.pow(sum, 1 / this.p);
    }

    public skill_difference(team_a: Player[], team_b: Player[]): number {
        return Math.abs(this.team_skill(team_a) - this.team_skill(team_b));
    }

    public mean_skill(players: Player[]): number {
        let sum = 0;
        for (const player of players) {
            sum += player.elo;
        }
        return sum / players.length;
    }

    public uniformity(players: Player[]): number {
        const mean = this.mean_skill(players);
        let sum = 0;
        for (const player of players) {
            sum += Math.pow(Math.abs(player.elo - mean), this.q);
        }
        return Math.pow(sum / players.length, 1 / this.q);
    }

    public imbalance_function_1(team_a: Player[], team_b: Player[]) {
        return this.alpha * this.skill_difference(team_a, team_b) + this.uniformity(team_a.concat(team_b));
    }

    public imbalance_function(team_a: Player[], team_b: Player[]) {
        let teamA: Team = new Team();
        for (let player of team_a) {
            teamA.join(player, JoinConfig.System);
        }
        // put the second half in team b
        let teamB: Team = new Team();
        for (let player of team_b) {
            teamB.join(player, JoinConfig.System);
        }
        const match = new Match(teamA, teamB);
        // determine the actual scores
        let scoreA: Score = match.winnerToScore(match.teamA.players[0], Teams.TeamA);
        let scoreB: Score = match.winnerToScore(match.teamB.players[0], Teams.TeamB);
    
        // calculate the average elo of every team for the expected scores
        let avgEloA: number = match.teamA.averageElo();
        let avgEloB: number = match.teamB.averageElo();
    
        // start avg elo gain calc
        let elo_gain_a = 0;
        let elo_gain_b = 0;
    
        // calculate the expected scores for every player (calculated with average enemy elo) and update elo
        match.teamA.players.forEach(player => {
            // calculated as if every player in team A fought against the average of team B
            let expScore = Elo.expectedScore(player.elo, avgEloB);
            let newElo = Elo.newElo(player, scoreA, expScore);
            elo_gain_a += newElo - player.elo;
        });
        match.teamB.players.forEach(player => {
            // calculated as if every player in team B fought against the average of team A
            let expScore = Elo.expectedScore(player.elo, avgEloA);
            let newElo = Elo.newElo(player, scoreB, expScore);
            elo_gain_b += newElo - player.elo;
        });
        return Math.abs(elo_gain_a - elo_gain_b);
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
import Match, { Teams } from "../../matches/Match";
import Player from "../../players/Player";
import Pool from "../Pool";
import Team, { JoinConfig } from "../../players/Team";
import PoolSystem from "../PoolSystem";
import Role, { Roles } from "../../players/Role";
import Config from "../../Config";
import Elo, { Score } from "../../matches/Elo";

export default class Solo2v2Impl extends Pool {
    static readonly poolSystem = PoolSystem.Solo2v2;
    readonly maxPremadeSize = 1;
    readonly maxTeamSize = 2;

    private players: Player[];
    private readonly min_fairness = Number.NEGATIVE_INFINITY;

    // these constraints have to be fulfilles for a match that is generated
    private readonly match_constraints: ((match: Match) => Promise<boolean>)[] = [
        async match => {
            // check team A
            let represented_roles_A: Role[] = [];
            for (const player of match.teamA.players) {
                represented_roles_A = represented_roles_A.concat(player.roles);
            }
            if (!represented_roles_A.includes(Config.roles[Roles.Runner])) return false;
            if (!represented_roles_A.includes(Config.roles[Roles.Support]) || !represented_roles_A.includes(Config.roles[Roles.Defense])) return false;
            // check team B
            let represented_roles_B: Role[] = [];
            for (const player of match.teamB.players) {
                represented_roles_B = represented_roles_B.concat(player.roles);
            }
            if (!represented_roles_B.includes(Config.roles[Roles.Runner])) return false;
            if (!represented_roles_B.includes(Config.roles[Roles.Support]) || !represented_roles_B.includes(Config.roles[Roles.Defense])) return false;
            // both checked, we're ok
            return true;
        },
        async match => await this.evaluate(match) >= this.min_fairness, // evaluation score high enough?
    ];

    private async all_constraints_fulfilled(match: Match): Promise<boolean> {
        for (const constraint of this.match_constraints) {
            if (! await constraint(match)) return false;
        }
        return true;
    }

    constructor() {
        super();
        this.players = [];
    }

    add(team: Team): void {
        for (let player of team.players) {
            this.players.push(player);
        }
    }

    remove(players: Player[]): void {
        // should remove every team that contains the players passed as argument
        for (let player of players) {
            let index = this.players.indexOf(player);
            this.players.splice(index, 1);
        }
    }

    async *getMatches(): AsyncGenerator<Match, void, void> {
        // https://stackoverflow.com/questions/53119389/team-matchmaking-algorithm-based-on-elo/53246693
        console.log(`Players in Pool: ${this.players.map(player => `ID: ${player.id}, Elo: ${player.elo}, Roles: ${player.roles.map(role => role.display_name)}`).join('\n')}\n`);
        let matched_players: Player[] = [];
        for (const players of this.make_list4()) {
            console.log(`Players already matched: ${matched_players.map(player => `ID: ${player.id}, Elo: ${player.elo}, Roles: ${player.roles.map(role => role.display_name)}`).join('\n')}\n`);
            console.log(`Players in List4: ${players.map(player => `ID: ${player.id}, Elo: ${player.elo}, Roles: ${player.roles.map(role => role.display_name)}`).join('\n')}\n`);
            // sort players by elo
            function player_sort(player1: Player, player2: Player) {
                if (player1.elo < player2.elo) return 1;
                if (player1.elo > player2.elo) return -1;
                return 0;
            }
            players.sort(player_sort);
            // outer fight against inner
            const team_A = new Team();
            team_A.join(players[1], JoinConfig.System);
            team_A.join(players[2], JoinConfig.System);
            const team_B = new Team();
            team_B.join(players[0], JoinConfig.System);
            team_B.join(players[3], JoinConfig.System);
            const match = new Match(team_A, team_B);
            // match has to fulfill constraints
            // matches shouldn't match already matched players
            if (await this.all_constraints_fulfilled(match) && !Solo2v2Impl.intersect(matched_players, match.players)) {
                console.log("All constraints fulfilled.")
                yield match;
                matched_players = matched_players.concat(match.players);
                this.remove(match.players);
            }
        }
    }

    private make_list2(): Player[][] {
        // sort players (list1)
        function player_sort(player1: Player, player2: Player) {
            if (player1.elo < player2.elo) return 1;
            if (player1.elo > player2.elo) return -1;
            return 0;
        }
        this.players.sort(player_sort);

        // list2
        let list2: Player[][] = [];
        for (let i = 0; i < this.players.length - 1; ++i) {
            list2.push([this.players[i], this.players[i + 1]]);
        }
        function list2_sort(set1: Player[], set2: Player[]) {
            const set1_elo_diff = Math.abs(set1[0].elo - set1[1].elo);
            const set2_elo_diff = Math.abs(set2[0].elo - set2[1].elo);
            if (set1_elo_diff < set2_elo_diff) return 1;
            if (set1_elo_diff > set2_elo_diff) return -1;
            return 0;
        }
        list2.sort(list2_sort);
        return list2;
    }

    private make_list4(): Player[][] {
        // to make list4, we first have to make list2
        const list2 = this.make_list2();
        let list4: Player[][] = [];
        for (let i = 0; i < list2.length; ++i) {
            // pair each pair with the closest pair *below* that does not intersect it
            for (let j = i; j < list2.length; ++j) {
                if (!Solo2v2Impl.intersect(list2[i], list2[j])) {
                    // pair each pair with the closest pair that does not intersect it
                    list4.push(list2[i].concat(list2[j]));  // push the players in the 2 lists to the new list
                    break;
                }
            }
            // pair each pair with the closest pair *above* that does not intersect it
            for (let j = i; j >= 0; --j) {
                if (!Solo2v2Impl.intersect(list2[i], list2[j])) {
                    // pair each pair with the closest pair that does not intersect it
                    const list4_pair = list2[i].concat(list2[j]);
                    if (!list4.includes(list4_pair)) {
                        // only if it isn't already included tho
                        list4.push(list4_pair);  // push the players in the 2 lists to the new list
                        break;
                    }
                }
            }
        }
        return list4;
    }

    private static intersect(set1: Player[], set2: Player[]): boolean {
        const small_set = set1.length > set2.length ? set2 : set1;
        const big_set = new Set(set1.length > set2.length ? set1 : set2);
        for (const player of small_set) {
            if (big_set.has(player)) return true;
        }
        return false;
    }

    async evaluate(match: Match) {
        for (let player of match.players) {
            await player.setup();
        }
    
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
        return - Math.abs(elo_gain_a - elo_gain_b);
    }
}
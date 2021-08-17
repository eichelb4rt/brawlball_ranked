import Player from "../players/Player";

/**
 * The MatchFinder is a generic interface for datastructures that are able to find matches.
 */
export default interface MatchFinder {
    /**
     * Adds players to the datastructure.
     * @param players A team of players who want to be in a match.
     */
    add(players: Player[]): void;

    /**
     * Removes plares from the datastructure.
     * @param players A group of players that are currently in the datastructure but want to be removed.
     */
    remove(players: Player[]): void;

    /**
     * Finds a match consisting of multiple (most likely 2) teams of players.
     * If no good matches exist, none is returned.
     * @returns The players in the match, separated in arrays that represent the teams.
     */
    extract_match(): Player[][] | undefined;
}
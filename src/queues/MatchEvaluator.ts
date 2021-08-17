import Player from "../players/Player";

/**
 * Evaluates the quality of matches based on various factors like elo distribution.
 */
export default interface MatchEvaluator {
    /**
     * Calculates the quality of the match.
     * @param match Match to be evaluated.
     * @returns Match quality. Higher values mean higher quality.
     */
    quality(match: Player[][]): number;

    /**
     * Function for ordering matches in the heap.
     * @param match_1 A match.
     * @param match_2 A match.
     * @returns -1: q(1) > q(2), 0: q(1) == q(2), 1: q(1) < q(2)
     */
    heap_order(match_1: Player[][], match_2: Player[][]): number;
}
import PoolSystem from "./PoolSystem";

export default interface QueueBlueprint {
    dbname: string;
    displayName: string;
    poolSystem: PoolSystem;
}
export default interface Role {
    db_name: string;
    display_name: string;
    emoji: string;
    acceptable_names: string[];
}

export enum Roles {
    Runner,
    Support,
    Defense
}
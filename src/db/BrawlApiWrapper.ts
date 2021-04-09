import Axios from "axios"
import Config from "../Config";
import Tokens from "../keys"

export default class BrawlApiWrapper {
    private static instance: BrawlApiWrapper;
    public static getInstance(): BrawlApiWrapper {
        if (!this.instance)
            this.instance = new this();
        return this.instance;
    }

    public readonly refresh_time = 10 * 60 * 1000;
    private name_cache: MyCache<string, string>;
    private constructor() {
        this.name_cache = new MyCache(this.refresh_time, this.ask_brawl_for_id);
    }

    public async getNameByID(brawlid: string): Promise<string> {
        return this.name_cache.get(brawlid);
    }

    private async ask_brawl_for_id(brawlid: string): Promise<string> {
        return await Axios.get(`${Config.BrawlAPI}/player/${brawlid}/stats`, {
            params: {
                api_key: Tokens.brawlhalla,
            }
        }).then((res) => {
            return res.data.name;
        }).catch((err) => {
            return err;
        });
    }
}

export class CachedValue<T> {
    readonly created: Date;
    readonly value: T;

    public constructor(value: T) {
        this.created = new Date(Date.now());
        this.value = value;
    }

    public get age() {
        return Date.now() - this.created.getTime();
    }
}

export class MyCache<T, K> {
    private values: Map<T, CachedValue<K>>;
    public readonly refresh_time: number;
    public readonly refresh_function: (key: T) => Promise<K>;

    constructor(replace_time: number, refresh_function: (key: T) => Promise<K>) {
        this.values = new Map();
        this.refresh_time = replace_time;
        this.refresh_function = refresh_function;
    }

    public async get(key: T): Promise<K> {
        // add it if it's new
        let cached_value: CachedValue<K>
        if (!this.values.has(key)) {
            const value: K = await this.refresh_function(key);
            cached_value = new CachedValue(value);
            this.values.set(key, cached_value);
            return value;
        }

        // not new - check if it's age has expired the replace time
        cached_value = this.values.get(key)!; // it's definetly there since is just checked if the values have the key
        if (cached_value.age > this.refresh_time) { // update the cached value
            const new_value = await this.refresh_function(key);
            cached_value = new CachedValue(new_value);
            this.values.set(key, cached_value);
        }
        return cached_value.value;
    }
}
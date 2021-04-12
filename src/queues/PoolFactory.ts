import FS from "fs";
import Path from "path";
import Config from "../Config";
import Pool from "./Pool"
import PoolSystem from "./PoolSystem";

export default class PoolFactory {
    // creates PoolImplementaions based on the PoolSystem
    // static wouldn't work because Config somehow wouldn't exist at runtime?
    // so another singleton then

    private static instance: PoolFactory;

    public static getInstance(): PoolFactory {
        if (!PoolFactory.instance)
            PoolFactory.instance = new PoolFactory();
        return PoolFactory.instance;
    }
    
    private readonly implementations;

    private constructor() {
        this.implementations = [];
        for (const implName of PoolFactory.getPoolNames()) {
            const implClass = require(`./${Config.poolImplementationsDir}/${implName}`).default;
            this.implementations.push(implClass);
		}
    }

    public newPool(system: PoolSystem): Pool {  // linear runtime atm, could maybe be done in constant time (this.implementation[system] because system 0 is stored at index 0)
        for (let Implementaion of this.implementations) {
            if (Implementaion.poolSystem == system) {
                return new Implementaion();
            }
        }
        throw new Error("PoolSystem not implemented");
    }

    private static getPoolNames(): string[] {
		// returns names of files in the directory path
		let files: string[] = [];
		FS.readdirSync(`./src/${Config.poolDir}/${Config.poolImplementationsDir}`).forEach(file => {
			files.push(Path.parse(file).name);
		})
		return files;
	}
}
import Axios from "axios"
import Config from "../Config";
import Tokens from "../keys"

export default class BrawlApiWrapper {
    static async getNameByID(brawlid: string): Promise<string> {
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
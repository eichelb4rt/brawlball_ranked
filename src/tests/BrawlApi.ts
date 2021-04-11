import BrawlApiWrapper from "../db/BrawlApiWrapper";
import Test from "../interfaces/Test";

export default class BrawlApiTest extends Test {
    name = "Brawl Api Test";

    public async run(): Promise<boolean> {
        const brawl_api_wrapper = BrawlApiWrapper.getInstance();
        return await brawl_api_wrapper.getNameByID('571826') === 'eichelbart';
    }
}
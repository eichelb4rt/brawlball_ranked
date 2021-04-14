import Discord from "discord.js";
import Config from "../Config";
import Test from "../interfaces/Test";

export default class DiscordApiTest extends Test {
    name = "Discord Api can login";

    public async run(): Promise<boolean> {
        const client = new Discord.Client();
        try {
            await client.login(Config.DISCORD_API_TOKEN);
            client.destroy();
            return true;
        } catch {
            return false;
        }
    }
}
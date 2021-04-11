export default abstract class Test {
    public abstract readonly name: string;
    public readonly enabled: boolean = true;
    public abstract run(): Promise<boolean>;
}
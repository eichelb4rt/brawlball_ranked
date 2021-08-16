import MinHeap from "./MinHeap";

/**
 * MinHeap that keeps track of objects indices inside the datastructure.
 */
export default class FastAccessMinHeap<T> extends MinHeap<T> {
    private indices: Map<T, number> = new Map();

    public get_index(value: T): number | undefined {
        return this.indices.get(value);
    }

    override insert(value: T) {
        this.indices.set(value, this.heapsize);
        super.insert(value);
    }

    override delete(i: number) {
        let value: T = this.arr[i];
        super.delete(i);
        this.indices.delete(value);
    }

    override switch(a: number, b: number) {
        super.switch(a, b);
        this.indices.set(this.arr[a], a);
        this.indices.set(this.arr[b], b);
    }
}
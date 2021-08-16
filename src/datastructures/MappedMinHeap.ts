import FastAccessMinHeap from "./FastAccessMinHeap";

/**
 * This datastructure maps index elements (T) to values (K) in a MinHeap (and back).
 * Values and indices must be unique.
 */
export default class MappedMinHeap<T, K> {
    private readonly map: Map<T, K> = new Map();
    private readonly reverse_map: Map<K, T> = new Map();
    private readonly heap: FastAccessMinHeap<K>;

    constructor(order: (a: K, b: K) => number) {
        this.heap = new FastAccessMinHeap<K>(order);
    }

    public set(index: T, value: K) {
        if (!this.map.has(index)) {
            this.insert(index, value);
        } else {
            this.change_value(index, value);
        }
    }

    private insert(index: T, value: K) {
        if (this.map.has(index)) {
            throw RangeError("Index already exists.");
        }
        if (this.reverse_map.has(value)) {
            throw RangeError("Value already exists.");
        }
        this.heap.insert(value);
        this.map.set(index, value);
        this.reverse_map.set(value, index);
    }

    private change_value(index: T, value: K) {
        if (!this.map.has(index)) {
            throw RangeError("Index must already exist.");
        }
        if (this.reverse_map.has(value) && this.reverse_map.get(value) !== index) {
            throw RangeError("Value already exists.");
        }
        const old_value = this.map.get(index)!;
        const heap_index = this.heap.get_index(old_value)!;
        this.heap.change_value(heap_index, value);
        this.map.set(index, value);
        this.reverse_map.delete(old_value);
        this.reverse_map.set(value, index);
    }

    public delete(index: T) {
        if (!this.map.has(index)) {
            throw RangeError("Index must already exist.");
        }
        const old_value = this.map.get(index)!;
        const heap_index = this.heap.get_index(old_value)!;
        this.heap.delete(heap_index);
        this.reverse_map.delete(old_value);
    }

    public extract_min(): K {
        const value = this.heap.extract_min();
        const index: T = this.reverse_map.get(value)!;
        this.map.delete(index);
        this.reverse_map.delete(value);
        return value;
    }

    public get root(): K | undefined {
        return this.heap.root;
    }
}
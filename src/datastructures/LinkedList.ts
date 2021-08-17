import Match from "../matches/Match";

export interface LinkedListNode<T> {
    value: T;
    prev?: LinkedListNode<T>;
    next?: LinkedListNode<T>;
}

export default class LinkedList<T> {
    public head: LinkedListNode<T> | undefined;
    public tail: LinkedListNode<T> | undefined;
    private _size: number = 0;

    public get size(): number {
        return this._size;
    }

    /**
     * Adds a new node to the back of the list.
     * @param value The value of the new node.
     * @returns the newly created node.
     */
    public add(value: T): LinkedListNode<T> {
        ++this._size;
        let new_node: LinkedListNode<T> = { value: value, next: undefined };
        if (this.is_empty()) {
            this.head = this.tail = new_node;
            return new_node;
        }
        this.tail!.next = new_node;
        new_node.prev = this.tail;
        this.tail = new_node;
        return new_node;
    }

    /**
     * Adds a new node to the front of the list.
     * @param value The value of the new node.
     * @returns the newly created node.
     */
    public add_front(value: T): LinkedListNode<T> {
        ++this._size;
        let new_node: LinkedListNode<T> = { value: value, prev: undefined };
        if (this.is_empty()) {
            this.head = this.tail = new_node;
            return new_node;
        }
        this.head!.prev = new_node;
        new_node.next = this.head;
        this.head = new_node;
        return new_node;
    }

    /**
     * Removes the node from the linked list.
     * @param node The node that will be removed.
     */
    public remove(node: LinkedListNode<T>) {
        --this._size;
        let prev_node = node.prev;
        let next_node = node.next;
        if (node === this.head && node === this.tail) {
            this.head = this.tail = undefined;
        } else if (node == this.head) {
            next_node!.prev = undefined;
            this.head = next_node;
        } else if (node == this.tail) {
            prev_node!.next = undefined;
            this.tail = prev_node;
        } else {
            prev_node!.next = next_node;
            next_node!.prev = prev_node;
        }
    }

    /**
     * Inserts a value after a node in the list.
     * @param prev_node The node that the value is inserted after.
     * @param value The value inserted in the list.
     * @returns the newly created node.
     */
    public insert_after(prev_node: LinkedListNode<T>, value: T): LinkedListNode<T> {
        if (prev_node === this.tail) {
            return this.add(value);
        }
        return this.insert_between(prev_node, prev_node.next!, value);
    }

    /**
     * Inserts a value before a node in the list.
     * @param next_node The node that the value is inserted before.
     * @param value The value inserted in the list.
     * @returns the newly created node.
     */
    public insert_before(next_node: LinkedListNode<T>, value: T): LinkedListNode<T> {
        if (next_node === this.head) {
            return this.add_front(value);
        }
        return this.insert_between(next_node.prev!, next_node, value);
    }

    /**
     * Inserts a value between 2 nodes in the list.
     * @param prev_node The node that the value is inserted after.
     * @param next_node The node that the value is inserted before.
     * @param value The value inserted in the list.
     * @returns the newly created node.
     */
    private insert_between(prev_node: LinkedListNode<T>, next_node: LinkedListNode<T>, value: T): LinkedListNode<T> {
        if (prev_node.next !== next_node || next_node.prev !== prev_node) {
            throw RangeError("Nodes must be adjacent");
        }
        ++this._size;
        let new_node: LinkedListNode<T> = { value: value, prev: prev_node, next: next_node };
        prev_node.next = new_node;
        next_node.prev = new_node;
        return new_node;
    }

    public is_empty(): boolean {
        return this.head === undefined;
    }

    /**
     * Jumps n nodes from "from".
     * @param from The node the walk starts from.
     * @param n The amount of walked nodes.
     * @returns The destination of the walk.
     */
    public jump(from: LinkedListNode<T>, n: number): LinkedListNode<T> | undefined {
        if (n >= 0) {
            return this.jump_forward(from, n);
        } else {
            return this.jump_backward(from, -n);
        }
    }

    /**
     * Jumps n nodes forwards from "from".
     * @param from The node the walk starts from.
     * @param n The amount of walked nodes.
     * @returns The destination of the walk.
     */
    private jump_forward(from: LinkedListNode<T>, n: number): LinkedListNode<T> | undefined {
        let node: LinkedListNode<T> | undefined = from;
        for (let i = 0; i < n; ++i) {
            if (node === undefined) {
                break;
            }
            node = node.next;
        }
        return node;
    }

    /**
     * Jumps n nodes backwards from "from".
     * @param from The node the walk starts from.
     * @param n The amount of walked nodes.
     * @returns The destination of the walk.
     */
    private jump_backward(from: LinkedListNode<T>, n: number): LinkedListNode<T> | undefined {
        let node: LinkedListNode<T> | undefined = from;
        for (let i = 0; i < n; ++i) {
            if (node === undefined) {
                break;
            }
            node = node.prev;
        }
        return node;
    }

    /**
     * Walks n nodes from "from".
     * @param from The node the walk starts from.
     * @param n The amount of walked nodes.
     * @yields The nodes along the walk.
     */
    public *walk(from: LinkedListNode<T> | undefined = this.head, n: number = Number.MAX_VALUE): Generator<LinkedListNode<T>, void, void> {
        if (from === undefined) {
            return;
        }
        if (n >= 0) {
            for (const node of this.walk_forward(from, n)) {
                yield node;
            }
        } else {
            for (const node of this.walk_backward(from, -n)) {
                yield node;
            }
        }
    }

    /**
     * Walks n nodes forwards from "from".
     * @param from The node the walk starts from.
     * @param n The amount of walked nodes.
     * @yields The nodes along the walk.
     */
    private *walk_forward(from: LinkedListNode<T>, n: number): Generator<LinkedListNode<T>, void, void> {
        let node: LinkedListNode<T> = from;
        for (let i = 0; i < n; ++i) {
            yield node;
            if (node.next === undefined) {
                break;
            }
            node = node.next;
        }
    }

    /**
     * Walks n nodes backwards from "from".
     * @param from The node the walk starts from.
     * @param n The amount of walked nodes.
     * @yields The nodes along the walk.
     */
    private *walk_backward(from: LinkedListNode<T>, n: number): Generator<LinkedListNode<T>, void, void> {
        let node: LinkedListNode<T> = from;
        for (let i = 0; i < n; ++i) {
            yield node;
            if (node.prev === undefined) {
                break;
            }
            node = node.prev;
        }
    }

    public to_array(): T[] {
        let arr: T[] = new Array<T>(this.size);
        let index = 0;
        for (const node of this.walk()) {
            arr[index++] = node.value;
        }
        return arr;
    }

    /**
     * Walks forwards from "from" until it reached end.
     * @param from The node the walk starts from.
     * @param end The node the walk ends at.
     * @yields The nodes along the walk [from,end).
     */
    public *nodes_between(start: LinkedListNode<T>, end: LinkedListNode<T> | undefined): Generator<LinkedListNode<T>, void, void> {
        let node: LinkedListNode<T> | undefined;
        for (node = start; node !== end; node = node.next) {
            if (node === undefined) {
                break;
            }
            yield node;
        }
    }
}
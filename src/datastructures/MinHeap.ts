export default class MinHeap<T> {
    protected arr: T[];
    public heapsize: number    // length of the part of the array that represents the heap
    private readonly order: (a: T, b: T) => number  // 1: a > b, -1: a < b, 0: a = b

    constructor(order: (a: T, b: T) => number) {
        this.arr = [];
        this.heapsize = 0;
        this.order = order;
    }

    protected *[Symbol.iterator]() {
        for (let i = 0; i < this.heapsize; ++i) {
            yield this.arr[i];
        }
    }

    protected father(i: number): number {
        return Math.ceil(i / 2) - 1;
    }

    protected left(i: number): number {
        return 2 * i + 1;
    }

    protected right(i: number): number {
        return 2 * i + 2;
    }

    protected switch(a: number, b: number) {
        const temp = this.arr[a];
        this.arr[a] = this.arr[b];
        this.arr[b] = temp;
    }

    // greater than
    protected gt(a: T, b: T): boolean {
        return this.order(a, b) === 1;
    }

    // less than
    protected lt(a: T, b: T): boolean {
        return this.order(a, b) === -1;
    }

    // greater or equal
    protected geq(a: T, b: T): boolean {
        const order = this.order(a,b);
        return order === 1 || order === 0;
    }

    // less or equal
    protected leq(a: T, b: T): boolean {
        const order = this.order(a,b);
        return order === -1 || order === 0;
    }

    protected heapify(i: number) {
        const l = this.left(i);
        const r = this.right(i);
        let min: number = i;
        if (l < this.heapsize && this.lt(this.arr[l], this.arr[min])) {    // l < i
            min = l;
        }
        if (r < this.heapsize && this.lt(this.arr[r], this.arr[min])) {    // r < i
            min = r;
        }
        if (min !== i) {
            this.switch(i, min);
            this.heapify(min);
        }
    }

    public change_value(i: number, value: T) {
        if (this.gt(value, this.arr[i])) this.increase_value(i, value);
        else if (this.lt(value, this.arr[i])) this.decrease_value(i, value);
    }

    protected decrease_value(i: number, value: T) {
        if (this.gt(value, this.arr[i])) {
            throw new Error(`Cannot decrease value ${this.arr[i]} to ${value}.`);
        }
        this.arr[i] = value;
        while (i > 1 && this.gt(this.arr[this.father(i)], this.arr[i])) {   // while under root and A[father(i)] > A[i]
            this.switch(this.father(i), i);
            i = this.father(i);
        }
    }

    protected increase_value(i: number, value: T) {
        if (this.lt(value, this.arr[i])) {
            throw new Error(`Cannot increase value ${this.arr[i]} to ${value}.`);
        }
        this.arr[i] = value;
        this.heapify(i);
    }

    public insert(value: T) {
        let i = this.heapsize++;
        // basically decrease_value
        if (i >= this.arr.length) {
            this.arr.push(value)
        } else {
            this.arr[i] = value;
        }
        while (i > 0 && this.gt(this.arr[this.father(i)], this.arr[i])) {   // while under root and A[father(i)] > A[i]
            this.switch(this.father(i), i);
            i = this.father(i);
        }
    }

    public extract_min(): T {
        if (this.heapsize < 1) {
            throw new Error("Heap is empty.");
        }
        const max = this.arr[0];
        this.delete(0);
        return max;
    }

    public delete(i: number) {
        this.switch(i, --this.heapsize);
        this.heapify(i);
    }

    public get root(): T | undefined {
        if (this.heapsize === 0) {
            return undefined;
        }
        return this.arr[0];
    }
}
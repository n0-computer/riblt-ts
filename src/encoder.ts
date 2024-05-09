import { RandomMapping } from "./mapping"
import { CodedSymbol, HashedSymbol, Symbol } from "./symbol"

// symbolMapping is a mapping from a source symbol to a coded symbol. The
// symbols are identified by their indices in CodingWindow.
type SymbolMapping = {
	sourceIdx: number
	codedIdx: number
}

// MappingHeap implements a priority queue of symbolMappings. The priority is
// the codedIdx of a symbolMapping. A smaller value means higher priority.  The
// first item of the queue is always the item with the highest priority.  The
// fixHead and fixTail methods should be called after the first or the last
// item is modified (or inserted, in the case of the tail), respectively. The
// implementation is a partial copy of container/heap in Go 1.21.
class MappingHeap {
  private m: SymbolMapping[] = []

  length(): number {
    return this.m.length
  }
  push(sm: SymbolMapping) {
    this.m.push(sm)
    this.fixTail()
  }
  get(i: number): SymbolMapping {
    return this.m[i]
  }

  // fixHead reestablishes the heap invariant when the first item is modified.
  fixHead() {
    let curr = 0
    while (true) {
      let child = curr*2 + 1
      if (child >= this.m.length) {
        // no left child
        break
      }
      let rc = child + 1
      if (rc < this.m.length && this.m[rc].codedIdx < this.m[child].codedIdx) {
        child = rc
      }
      if (this.m[curr].codedIdx <= this.m[child].codedIdx) {
        break
      }
      // swap values
      [this.m[curr], this.m[child]] = [this.m[child], this.m[curr]]
      curr = child
    }
  }

  // fixTail reestablishes the heap invariant when the last item is modified or
  // just inserted.
  fixTail() {
    let curr = this.m.length - 1
    while (true) {
      let parent = Math.abs(Math.round((curr - 1) / 2))
      if (curr == parent || this.m[parent].codedIdx <= this.m[curr].codedIdx) {
        break
      }
      [this.m[parent], this.m[curr]] = [this.m[curr], this.m[parent]]
      curr = parent
    }
  }
}

// CodingWindow is a collection of source symbols and their mappings to coded symbols.
// TODO(b5): only exported so it's available to the decoder.
export class CodingWindow<T extends Symbol<T>> {
  private symbols:  HashedSymbol<T>[] = [] // source symbols
  private mappings: RandomMapping[] = []   // mapping generators of the source symbols
  private queue: MappingHeap = new MappingHeap()       // priority queue of source symbols by the next coded symbols they are mapped to
  private nextIdx:  number = 0               // index of the next coded symbol to be generated

  getSymbols() {
    return this.symbols
  }

  // addSymbol inserts a symbol to the CodingWindow.
  addSymbol(t: T) { 
    const th: HashedSymbol<T> = {
      symbol: t,
      hash: t.hash()
    }
    this.addHashedSymbol(th)
  }

  // addHashedSymbol inserts a HashedSymbol to the CodingWindow.
  addHashedSymbol(t: HashedSymbol<T>) {
    this.addHashedSymbolWithMapping(t, new RandomMapping(t.hash, 0))
  }

  // addHashedSymbolWithMapping inserts a HashedSymbol and the current state of its mapping generator to the CodingWindow.
  addHashedSymbolWithMapping(t: HashedSymbol<T>, m: RandomMapping) {
    this.symbols.push(t)
    this.mappings.push(m)
    const sm: SymbolMapping = {
      sourceIdx: this.symbols.length - 1,
      codedIdx: m.lastIdx
    }
    this.queue.push(sm)
  }

  // applyWindow maps the source symbols to the next coded symbol they should be
  // mapped to, given as cw. The parameter direction controls how the counter
  // of cw should be modified.
  applyWindow(cw: CodedSymbol<T>, direction: number): CodedSymbol<T> {
    if (this.queue.length() === 0) {
      this.nextIdx += 1
      return cw
    }
    while (this.queue.get(0).codedIdx === this.nextIdx) {
      cw = cw.appli(this.symbols[this.queue.get(0).sourceIdx], direction)
      // generate the next mapping
      let nextMap = this.mappings[this.queue.get(0).sourceIdx].nextIndex()
      this.queue.get(0).codedIdx = nextMap
      this.queue.fixHead()
    }
    this.nextIdx += 1
    return cw
  }

  // reset clears a CodingWindow.
  reset() {
    this.symbols = []
    this.mappings = []
    this.queue = new MappingHeap()
    this.nextIdx = 0
  }
}


// Encoder is an incremental encoder of Rateless IBLT.
export class Encoder<T extends Symbol<T>> {
  w: CodingWindow<T> = new CodingWindow()
  newSymbol: () => T

  constructor(newSymbol: () => T) {
    this.newSymbol = newSymbol
  }

  // AddSymbol adds a symbol to the encoder.
  addSymbol(s: T) {
    this.w.addSymbol(s)
  }

  // AddHashedSymbol adds a HashedSymbol to the encoder.
  addHashedSymbol(s: HashedSymbol<T>) {
    this.w.addHashedSymbol(s)
  }

  // ProduceNextCodedSymbol returns the next coded symbol the encoder produces.
  produceNextCodedSymbol(): CodedSymbol<T> {
    const next = new CodedSymbol<T>(this.newSymbol(), 0, 0)
    return this.w.applyWindow(next, 1)
  }

  // Reset clears the encoder.
  reset() {
    this.w.reset()
  }
}
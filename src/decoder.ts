import { CodingWindow } from "./encoder"
import { RandomMapping } from "./mapping"
import { Symbol, HashedSymbol, CodedSymbol } from "./symbol"

export class Decoder<T extends Symbol<T>> {
	// coded symbols received so far
	private cs: CodedSymbol<T>[] = []
	// set of source symbols that are exclusive to the decoder
	private local: CodingWindow<T> = new CodingWindow<T>()
	// set of source symbols that the decoder initially has
	private window: CodingWindow<T> = new CodingWindow<T>()
	// set of source symbols that are exclusive to the encoder
	private remote: CodingWindow<T> = new CodingWindow<T>()
	// indices of coded symbols that can be decoded, i.e., degree equal to -1
	// or 1 and sum of hash equal to hash of sum, or degree equal to 0 and sum
	// of hash equal to 0
	private decodable: number[] = []
	// number of coded symbols that are decoded
	private decoded: number = 0
  // newSymbol is a function that generates a new symbol
  newSymbol: () => T

  constructor(newSymbol: () => T) {
    this.newSymbol = newSymbol
    this.cs = []
    this.local = new CodingWindow<T>()
    this.window = new CodingWindow<T>()
    this.remote = new CodingWindow<T>()
    this.decodable = []
    this.decoded = 0
  }
  
  isDecoded(): boolean {
    return this.decoded == this.cs.length
  }
  
  getLocal(): HashedSymbol<T>[] {
    return this.local.getSymbols()
  }
  
  getRemote(): HashedSymbol<T>[] {
    return this.remote.getSymbols()
  }
  
  addSymbol(s: T) {
    const th: HashedSymbol<T> = { symbol: s, hash: s.hash() }
    this.addHashedSymbol(th)
  }
  
  addHashedSymbol(s: HashedSymbol<T>) {
    this.window.addHashedSymbol(s)
  }
  
  addCodedSymbol(c: CodedSymbol<T>) {
    // scan through decoded symbols to peel off matching ones
    c = this.window.applyWindow(c, -1)
    c = this.remote.applyWindow(c, -1)
    c = this.local.applyWindow(c, 1)
    // insert the new coded symbol
    this.cs.push(c)
    // check if the coded symbol is decodable, and insert into decodable list if so
    if ((c.count == 1 || c.count == -1) && (c.hash == c.symbol.hash())) {
      this.decodable.push(this.cs.length-1)
    } else if (c.count == 0 && c.hash == 0) {
      this.decodable.push(this.cs.length-1)
    }
    return
  }
  
  applyNewSymbol(t: HashedSymbol<T>, direction: number): RandomMapping {
    let m = new RandomMapping(t.hash, 0)
    while (m.lastIdx < this.cs.length) {
      let cidx = m.lastIdx
      this.cs[cidx] = this.cs[cidx].applySymbol(t, direction)
      // Check if the coded symbol is now decodable. We do not want to insert
      // a decodable symbol into the list if we already did, otherwise we
      // will visit the same coded symbol twice. To see how we achieve that,
      // notice the following invariant: if a coded symbol becomes decodable
      // with degree D (obviously -1 <= D <=1), it will stay that way, except
      // for that it's degree may become 0. For example, a decodable symbol
      // of degree -1 may not later become undecodable, or become decodable
      // but of degree 1. This is because each peeling removes a source
      // symbol from the coded symbol. So, if a coded symbol already contains
      // only 1 or 0 source symbol (the definition of decodable), the most we
      // can do is to peel off the only remaining source symbol.
      //
      // Meanwhile, notice that if a decodable symbol is of degree 0, then
      // there must be a point in the past when it was of degree 1 or -1 and
      // decodable, at which time we would have inserted it into the
      // decodable list. So, we do not insert degree-0 symbols to avoid
      // duplicates. On the other hand, it is fine that we insert all
      // degree-1 or -1 decodable symbols, because we only see them in such
      // state once.
      if ((this.cs[cidx].count == -1 || this.cs[cidx].count == 1) && this.cs[cidx].hash == this.cs[cidx].symbol.hash()) {
        this.decodable.push(cidx)
      }
      m.nextIndex()
    }
    return m
  }
  
  tryDecode() {
    for (let didx = 0; didx < this.decodable.length; didx += 1) {
      let cidx = this.decodable[didx]
      let c = this.cs[cidx]
      // We do not need to compare Hash and Symbol.Hash() below, because we
      // have checked it before inserting into the decodable list. Per the
      // invariant mentioned in the comments in applyNewSymbol, a decodable
      // symbol does not turn undecodable, so there is no worry that
      // additional source symbols have been peeled off a coded symbol after
      // it was inserted into the decodable list and before we visit them
      // here.
      switch (c.count) {
      case 1:
        this.addRemoteCodedSymbol(c)
        break;
      case -1:
        this.addLocalCodedSymbol(c)
        break;
      case 0:
        this.decoded += 1
        break;
      default:
        // a decodable symbol does not turn undecodable, so its degree must
        // be -1, 0, or 1
        throw new Error(`invalid degree for decodable coded symbol ${c.count}`)
      }
    }
    this.decodable = []
  }

  // allocate a symbol and then XOR with the sum, so that we are
  // guaranted to copy the sum whether or not the symbol interface is
  // implemented as a pointer
  addRemoteCodedSymbol(c: CodedSymbol<T>) {
    let ns: HashedSymbol<T> = {
      symbol: this.newSymbol(),
      hash: 0,
    }
    ns.symbol = ns.symbol.xor(c.symbol)
    ns.hash = c.hash
    let m = this.applyNewSymbol(ns, -1)
    this.remote.addHashedSymbolWithMapping(ns, m)
    this.decoded += 1
  }

  addLocalCodedSymbol(c: CodedSymbol<T>) {
    let ns: HashedSymbol<T> = {
      symbol: this.newSymbol(),
      hash: 0,
    }
    ns.symbol = ns.symbol.xor(c.symbol)
    ns.hash = c.hash
    let m = this.applyNewSymbol(ns, 1)
    this.local.addHashedSymbolWithMapping(ns, m)
    this.decoded += 1
  }
  
  reset() {
    this.cs = [];
    this.decodable = [];
    this.local.reset()
    this.remote.reset()
    this.window.reset()
    this.decoded = 0
  }
}

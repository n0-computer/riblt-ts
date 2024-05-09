import { Decoder } from "./decoder"
import { RandomMapping } from "./mapping"
import { CodedSymbol, HashedSymbol, Symbol } from "./symbol"

// Sketch is a prefix of the coded symbol sequence for a set of source symbols.
export class Sketch<T extends Symbol<T>> {
  s: CodedSymbol<T>[] = []
  newSymbol: () => T

  constructor(m: number, newSymbol: () => T){ 
    this.newSymbol = newSymbol
    for (let i = 0; i < m; i++) {
      this.s.push(new CodedSymbol(newSymbol(), 0, 0))
    }
  }

  // AddSymbol efficiently updates s when t is added to the set.
  addSymbol(t: T) {
    const hs: HashedSymbol<T> = {
      symbol: t,
      hash: t.hash()
    }
    this.addHashedSymbol(hs)
  }

  // RemoveSymbol efficiently updates s when t is removed from the set.
  removeSymbol(t: T) {
    const hs: HashedSymbol<T> = {
      symbol: t,
      hash: t.hash()
    }
    this.removeHashedSymbol(hs)
  }

  // AddHashedSymbol efficiently updates s when t is added to the set.
  addHashedSymbol(t: HashedSymbol<T>) {
    const m = new RandomMapping(t.hash, 0)
    while (m.lastIdx < this.s.length) {
      const idx = m.lastIdx
      this.s[idx].symbol = this.s[idx].symbol.xor(t.symbol)
      this.s[idx].count += 1
      // console.log(`xor time. index: ${idx}, symbol: ${t.symbol}, currentHash: ${this.s[idx].hash}, newHash: ${t.hash}, xor: ${this.s[idx].hash ^ t.hash}`)
      this.s[idx].hash ^= t.hash
      m.nextIndex()
    }
  }

  // RemoveHashedSymbol efficiently updates s when t is removed from the set.
  removeHashedSymbol(t: HashedSymbol<T>) {
    const m = new RandomMapping(t.hash, 0)
    while (m.lastIdx < this.s.length) {
      const idx = m.lastIdx
      this.s[idx].symbol = this.s[idx].symbol.xor(t.symbol)
      this.s[idx].count -= 1
      this.s[idx].hash ^= t.hash
      m.nextIndex()
    }
  }

  // Subtract subtracts s2 from s, modifying s in place. s and s2 must be of
  // equal length. If s is a sketch of set S and s2 is a sketch of set S2, then
  // the result is a sketch of the symmetric difference between S and S2.
  subtract(s2: Sketch<T>) {
    if (this.s.length != s2.s.length) {
      throw new Error("subtracting sketches of different sizes")
    }

    for (let i =0; i < this.s.length; i++){
      this.s[i].symbol = this.s[i].symbol.xor(s2.s[i].symbol)
      this.s[i].count = this.s[i].count - s2.s[i].count
      this.s[i].hash ^= s2.s[i].hash
    }
    return
  }

  // Decode tries to decode s, where s can be one of the following
  //  1. A sketch of set S.
  //  2. Content of s after calling s.Subtract(s2), where s is a sketch of set
  //     S, and s2 is a sketch of set S2.
  //
  // When successful, fwd contains all source symbols in S in case 1, or S \ S2
  // in case 2 (\ is the set subtraction operation). rev is empty in case 1, or
  // S2 \ S in case 2. succ is true. When unsuccessful, fwd and rev are
  // undefined, and succ is false.
  decode(): { fwd: HashedSymbol<T>[], rev: HashedSymbol<T>[], succ: boolean } {
    const dec = new Decoder<T>(this.newSymbol)
    this.s.forEach((c) => dec.addCodedSymbol(c))
    dec.tryDecode()
    return {
      fwd: dec.getRemote(),
      rev: dec.getLocal(),
      succ: dec.isDecoded()
    }
  }
}
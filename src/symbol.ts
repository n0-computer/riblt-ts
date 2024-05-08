// Symbol is the interface that source symbols should implement. It specifies a
// Boolean group, where T (or its subset) is the underlying set, and ^ is the
// group operation. It should satisfy the following properties:
//  1. For all a, b, c in the group, (a ^ b) ^ c = a ^ (b ^ c).
//  2. Let e be the default value of T. For every a in the group, e ^ a = a
//     and a ^ e = a.
//  3. For every a in the group, a ^ a = e.
export interface Symbol<T> {
	// XOR returns t ^ t2, where t is the method receiver. XOR is allowed to
	// modify the method receiver. Although the method is called XOR (because
	// the bitwise exclusive-or operation is a valid group operation for groups
	// of fixed-length bit strings), it can implement any operation that
	// satisfy the aforementioned properties.
	xor: (t2: T) => T
	// Hash returns the hash of the method receiver. It must not modify the
	// method receiver. It must not be homomorphic over the group operation.
	// That is, the probability that
	//   (a ^ b).Hash() == a.Hash() ^ b.Hash()
	// must be negligible. Here, ^ is the group operation on the left-hand
	// side, and bitwise exclusive-or on the right side.
	hash: () => number
}


// HashedSymbol is the bundle of a symbol and its hash.
export interface HashedSymbol<T extends Symbol<T>> {
	symbol: T;
	hash: number;
}

export class CodedSymbol<T extends Symbol<T>> {
  public symbol: T
  public hash: number
	public count: number

  constructor(symbol: T, hash: number, count: number) {
    this.symbol = symbol
    this.hash = hash
    this.count = count
  }

  // apply maps s to c and modifies the counter of c according to direction. add
  // increments the counter, and remove decrements the counter.
  applySymbol(s: HashedSymbol<T>, direction: number): CodedSymbol<T> {
    this.symbol = this.symbol.xor(s.symbol)
    this.hash ^= s.hash
    this.count += direction
    return this
  }
}

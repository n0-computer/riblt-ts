import siphash from "siphash";

import { Encoder, Decoder } from "../src";

class TestSymbol {
  data: Uint8Array;
  static size = 8;

  constructor(data?: Uint8Array) {
    if (data && data.length !== TestSymbol.size) {
      throw new Error(`data must be of size ${TestSymbol.size}`);
    }
    this.data = data || new Uint8Array(TestSymbol.size);
  }

  xor(t2: TestSymbol): TestSymbol {
    // xor the bits of the data properties of this and t2
    for (let i = 0; i < TestSymbol.size; i++) {
      this.data[i] ^= t2.data[i];
    }

    // const dw = (*[TestSymbol.size / 8]uint64)(unsafe.Pointer(&d))
    // const t2w = (*[TestSymbol.size / 8]uint64)(unsafe.Pointer(&t2))
    // for let i = 0; i < TestSymbol.size/8; i++ {
    // 	(*dw)[i] ^= (*t2w)[i]
    // }
    return this
  }

  static hashKey = [
    0xdeadbeef, 
    0xcafebabe, 
    0x8badf00d, 
    0x1badb002,
  ];

  hash(): number {
    let h = siphash.hash(TestSymbol.hashKey, this.data)
    return this.combineHighLow(h);
  }

  combineHighLow(obj: { h: number, l: number }) {
    // Convert the high part to a 32-bit integer if necessary
    const high = obj.h >>> 0;
    const low = obj.l >>> 0;

    // Shift the high part by 32 bits to the left and add the low part
    return high * Math.pow(2, 32) + low;
  }
}

test('encode and decode', () => {
  let enc = new Encoder<TestSymbol>(() => { return new TestSymbol() });
  let dec = new Decoder<TestSymbol>(() => { return new TestSymbol() });
  const local = [
    new TestSymbol(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
    new TestSymbol(new Uint8Array([2, 2, 3, 4, 5, 6, 7, 8])),
    new TestSymbol(new Uint8Array([3, 2, 3, 4, 5, 6, 7, 8])),
    new TestSymbol(new Uint8Array([4, 2, 3, 4, 5, 6, 7, 8])),
    new TestSymbol(new Uint8Array([5, 2, 3, 4, 5, 6, 7, 8])),
  ];
  local.forEach((s) => { 
    console.log('adding symbol', s)
    enc.addSymbol(s)
  });

  const remote = [
    new TestSymbol(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
    new TestSymbol(new Uint8Array([3, 2, 3, 4, 5, 6, 7, 8]))
  ];
  remote.forEach((s) => { dec.addSymbol(s) });

  let ncw = 0;
  while (true) {
    dec.addCodedSymbol(enc.produceNextCodedSymbol());
    ncw++;
    dec.tryDecode();
    if (dec.isDecoded())  {
      break;
    }
  }

  console.log(`${ncw} codewords until fully decoded`);
});
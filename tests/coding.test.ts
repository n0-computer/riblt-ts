import siphash from "siphash";

import { Encoder, Decoder } from "../src";

export class TestSymbol {
  data: number;
  static size = 1;

  constructor(data: number) {
    this.data = data
  }

  xor(t2: TestSymbol): TestSymbol {
    this.data ^= t2.data
    return this
  }

  static hashKey = [
    0xdeadbeef, 
    // 0xcafebabe,
    // 0x8badf00d,
    // 0x1badb002,
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

test('TestSymbol xor', () => {
  const a = new TestSymbol(1);
  const b = new TestSymbol(2);
  a.xor(b);
  expect(a.data).toBe(3);
  a.xor(b);
  expect(a.data).toBe(1);
})

test('encode and decode', () => {
  // let enc = new Encoder<TestSymbol>(() => { return new TestSymbol() });
  // let dec = new Decoder<TestSymbol>(() => { return new TestSymbol() });
  // const local = [
  //   new TestSymbol(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
  //   new TestSymbol(new Uint8Array([2, 2, 3, 4, 5, 6, 7, 8])),
  //   new TestSymbol(new Uint8Array([3, 2, 3, 4, 5, 6, 7, 8])),
  //   new TestSymbol(new Uint8Array([4, 2, 3, 4, 5, 6, 7, 8])),
  //   new TestSymbol(new Uint8Array([5, 2, 3, 4, 5, 6, 7, 8])),
  // ];
  // local.forEach((s) => { 
  //   enc.addSymbol(s)
  // });

  // const remote = [
  //   new TestSymbol(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
  //   new TestSymbol(new Uint8Array([3, 2, 3, 4, 5, 6, 7, 8]))
  // ];
  // remote.forEach((s) => { dec.addSymbol(s) });

  // let ncw = 0;
  // while (true) {
  //   const next = enc.produceNextCodedSymbol()
  //   console.log('next coded symbol', next)
  //   if (ncw > 4) {
  //     break;
  //   }
  //   dec.addCodedSymbol(next);
  //   ncw++;
  //   dec.tryDecode();
  //   if (dec.isDecoded())  {
  //     break;
  //   }
  // }

  // const remoteSymbols = dec.getRemote()
  // console.log('remote symbols', remoteSymbols)
  // const localSymbols = dec.getLocal()
  // console.log('local symbols', localSymbols) 

  // if (!dec.isDecoded()) {
  //   throw new Error('decoder not marked as decoded');
  // }

  // console.log(`${ncw} codewords until fully decoded`);
});
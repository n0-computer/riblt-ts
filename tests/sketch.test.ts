import { Sketch } from "../src/sketch";
import { TestSymbol } from "./coding.test";


test('sketch add symbol', () => {
  let localSketch = new Sketch<TestSymbol>(6, () => { return new TestSymbol(0) });
  const local = [
    new TestSymbol(1),
    // new TestSymbol(2),
    // new TestSymbol(new Uint8Array([8, 9, 3, 4, 5, 6, 7, 8])),
    // new TestSymbol(new Uint8Array([3, 2, 3, 4, 5, 6, 7, 8])),
    // new TestSymbol(new Uint8Array([4, 2, 3, 4, 5, 6, 7, 8])),
    // new TestSymbol(new Uint8Array([5, 2, 3, 4, 5, 6, 7, 8])),
  ];
  local.forEach((s) => { 
    localSketch.addSymbol(s)
  });

  console.log("REMOTE")

  let remoteSketch = new Sketch<TestSymbol>(6, () => { return new TestSymbol(0) });
  const remote = [
    new TestSymbol(2),
    new TestSymbol(12),
  ];
  remote.forEach((s) => { remoteSketch.addSymbol(s) });

  console.log(localSketch.s)
  console.log(remoteSketch.s)
  localSketch.subtract(remoteSketch)
  console.log(localSketch.s)
  let { fwd, rev, succ } = localSketch.decode()
  console.log(fwd)
  console.log(rev)
  expect(succ).toBe(true)
})
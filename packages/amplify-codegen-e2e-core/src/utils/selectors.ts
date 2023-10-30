import { ExecutionContext } from '..';
import { KEY_DOWN_ARROW, KEY_UP_ARROW } from '..';

export const moveDown = (chain: ExecutionContext, nMoves: number) =>
  Array.from(Array(nMoves).keys()).reduce((chain, _idx) => chain.send(KEY_DOWN_ARROW), chain);

export const moveUp = (chain: ExecutionContext, nMoves: number) =>
  Array.from(Array(nMoves).keys()).reduce((chain, _idx) => chain.send(KEY_UP_ARROW), chain);

export const singleSelect = <T>(chain: ExecutionContext, item: T, allChoices: T[]) => multiSelect(chain, [item], allChoices);

export const multiSelect = <T>(chain: ExecutionContext, items: T[] = [], allChoices: T[]) => {
  items
    .map(item => allChoices.indexOf(item))
    .filter(idx => idx > -1)
    .sort()
    // calculate the diff with the latest, since items are sorted, always positive
    // represents the numbers of moves down we need to make to selection
    .reduce((diffs, move) => (diffs.length > 0 ? [...diffs, move - diffs[diffs.length - 1]] : [move]), [] as number[])
    .reduce((chain, move) => moveDown(chain, move).send(' '), chain);
  chain.sendCarriageReturn();
  return chain;
};

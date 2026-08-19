import {toggleFavoriteSymbol} from './favorites';

it('toggles favorite symbols locally', () => {
  const added = toggleFavoriteSymbol(new Set(), 'BTCUSDT');
  expect(added.has('BTCUSDT')).toBe(true);
  const removed = toggleFavoriteSymbol(added, 'BTCUSDT');
  expect(removed.has('BTCUSDT')).toBe(false);
});

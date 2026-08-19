export type FavoriteSymbolState = ReadonlySet<string>;

export const toggleFavoriteSymbol = (favorites: FavoriteSymbolState, symbol: string): Set<string> => {
  const next = new Set(favorites);
  if (next.has(symbol)) next.delete(symbol);
  else next.add(symbol);
  return next;
};

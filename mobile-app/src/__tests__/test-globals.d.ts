type MockFn = ((...args: unknown[]) => unknown) & {mockResolvedValue: (v: unknown) => MockFn; mockRejectedValueOnce: (v: unknown) => MockFn; mockResolvedValueOnce: (v: unknown) => MockFn; mockReturnValue: (v: unknown) => MockFn; mockClear: () => void;};
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: ((value: unknown) => {toBe: (expected: unknown) => void; toEqual: (expected: unknown) => void; toHaveLength: (expected: number) => void; toContain: (expected: string) => void; toThrow: (expected?: unknown) => void; toHaveBeenCalledWith: (...expected: unknown[]) => void; toHaveBeenCalledTimes: (expected: number) => void; resolves: {toHaveLength: (expected: number) => Promise<void>}; rejects: {toThrow: (expected?: unknown) => Promise<void>};}) & {stringContaining: (value: string) => unknown; objectContaining: (value: Record<string, unknown>) => unknown;};
declare const beforeEach: (fn: () => void) => void;
declare const jest: {fn: () => MockFn; clearAllMocks: () => void; mock: (moduleName: string, factory: () => unknown) => void; requireMock: (moduleName: string) => unknown;};
declare namespace jest { type Mock = MockFn; }
declare const global: {fetch: MockFn};

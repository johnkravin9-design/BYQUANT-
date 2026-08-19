declare namespace React { namespace JSX { interface Element {} } }
declare module 'react' {
  export namespace JSX { interface Element {} }
  export type ReactNode = JSX.Element;
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((current: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useCallback<T extends (...args: any[]) => unknown>(callback: T, deps: readonly unknown[]): T;
  export function memo<T>(component: T): T;
  const React: {createElement: (...args: unknown[]) => JSX.Element};
  export default React;
}
declare module 'react-native' {
  import type {ReactNode} from 'react';
  export const ActivityIndicator: (props: Record<string, unknown>) => ReactNode;
  export const FlatList: <T>(props: {data: T[]; keyExtractor: (item: T) => string; renderItem: (info: {item: T}) => ReactNode; refreshControl?: ReactNode; ListEmptyComponent?: ReactNode; contentContainerStyle?: unknown}) => ReactNode;
  export const RefreshControl: (props: Record<string, unknown>) => ReactNode;
  export const SafeAreaView: (props: Record<string, unknown>) => ReactNode;
  export const StatusBar: (props: Record<string, unknown>) => ReactNode;
  export const Switch: (props: Record<string, unknown>) => ReactNode;
  export const Text: (props: Record<string, unknown>) => ReactNode;
  export const TouchableOpacity: (props: Record<string, unknown>) => ReactNode;
  export const View: (props: Record<string, unknown>) => ReactNode;
  export const StyleSheet: {create: <T extends Record<string, unknown>>(styles: T) => T};
}
declare module 'react-test-renderer' {
  export interface ReactTestRenderer { toJSON(): unknown; root: {findByProps(props: Record<string, unknown>): {props: Record<string, () => void>}}; }
  const renderer: {create(element: unknown): ReactTestRenderer};
  export const act: (callback: () => void | Promise<void>) => Promise<void>;
  export default renderer;
}
declare module '*.json' { const value: {version: string}; export default value; }
declare const process: {env?: Record<string, string | undefined>};

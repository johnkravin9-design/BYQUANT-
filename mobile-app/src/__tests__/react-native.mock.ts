import React from 'react';

const component = (name: string) => ({children, ...props}: Record<string, unknown> & {children?: unknown}) =>
  React.createElement(name, props, children);

export const ActivityIndicator = component('ActivityIndicator');
export const FlatList = ({data, renderItem, ListEmptyComponent}: {data: unknown[]; renderItem: (info: {item: unknown}) => unknown; ListEmptyComponent?: unknown}) =>
  React.createElement('FlatList', {}, data.length === 0 ? ListEmptyComponent : data.map((item, index) => React.createElement('Fragment', {key: index}, renderItem({item}))));
export const RefreshControl = component('RefreshControl');
export const SafeAreaView = component('SafeAreaView');
export const StatusBar = component('StatusBar');
export const Switch = component('Switch');
export const Text = component('Text');
export const TouchableOpacity = component('TouchableOpacity');
export const View = component('View');
export const StyleSheet = {create: <T extends Record<string, unknown>>(styles: T): T => styles};

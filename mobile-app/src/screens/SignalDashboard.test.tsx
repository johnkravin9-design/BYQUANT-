import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {SignalDashboard} from './SignalDashboard';
import {signalFixture} from '../__tests__/fixtures';

jest.mock('../api/client', () => ({getActiveSignals: jest.fn()}));
const {getActiveSignals} = jest.requireMock('../api/client') as {getActiveSignals: jest.Mock};

it('renders loading state', () => {
  getActiveSignals.mockReturnValue(new Promise(() => undefined));
  const tree = renderer.create(<SignalDashboard />).toJSON();
  expect(JSON.stringify(tree)).toContain('Loading latest signals');
});

it('renders empty state', async () => {
  getActiveSignals.mockResolvedValue([]);
  let component: import('react-test-renderer').ReactTestRenderer;
  await act(async () => { component = renderer.create(<SignalDashboard />); });
  expect(JSON.stringify(component!.toJSON())).toContain('No active signals');
});

it('renders error state and supports retry', async () => {
  getActiveSignals.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([signalFixture]);
  let component: import('react-test-renderer').ReactTestRenderer;
  await act(async () => { component = renderer.create(<SignalDashboard />); });
  expect(JSON.stringify(component!.toJSON())).toContain('Connection issue');
  const retryButton = component!.root.findByProps({accessibilityLabel: 'Retry'});
  await act(async () => { retryButton.props.onPress(); });
  expect(getActiveSignals).toHaveBeenCalledTimes(2);
});

it('refreshes manually', async () => {
  getActiveSignals.mockResolvedValue([signalFixture]);
  let component: import('react-test-renderer').ReactTestRenderer;
  await act(async () => { component = renderer.create(<SignalDashboard />); });
  const refreshButton = component!.root.findByProps({accessibilityLabel: 'Refresh latest signals'});
  await act(async () => { refreshButton.props.onPress(); });
  expect(getActiveSignals).toHaveBeenCalledTimes(2);
});

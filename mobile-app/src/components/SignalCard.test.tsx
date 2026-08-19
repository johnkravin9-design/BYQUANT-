import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {SignalCard} from './SignalCard';
import {signalFixture} from '../__tests__/fixtures';

it('renders signal card values and favorite state', async () => {
  let component: import('react-test-renderer').ReactTestRenderer;
  await act(async () => { component = renderer.create(<SignalCard signal={signalFixture} isFavorite={true} onPress={jest.fn()} onToggleFavorite={jest.fn()} />); });
  expect(JSON.stringify(component!.toJSON())).toContain('BTCUSDT');
  expect(JSON.stringify(component!.toJSON())).toContain('BUY');
  expect(JSON.stringify(component!.toJSON())).toContain('TP3');
  expect(JSON.stringify(component!.toJSON())).toContain('★');
});

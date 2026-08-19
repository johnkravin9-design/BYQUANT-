import React from 'react';
import renderer from 'react-test-renderer';
import {SignalCard} from './SignalCard';
import {signalFixture} from '../__tests__/fixtures';

it('renders signal card values and favorite state', () => {
  const tree = renderer.create(<SignalCard signal={signalFixture} isFavorite={true} onPress={jest.fn()} onToggleFavorite={jest.fn()} />).toJSON();
  expect(JSON.stringify(tree)).toContain('BTCUSDT');
  expect(JSON.stringify(tree)).toContain('BUY');
  expect(JSON.stringify(tree)).toContain('TP3');
  expect(JSON.stringify(tree)).toContain('★');
});

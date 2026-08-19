import React from 'react';
import renderer from 'react-test-renderer';
import {SignalDetails} from './SignalDetails';
import {signalFixture} from '../__tests__/fixtures';

it('renders signal details and quantitative disclaimer', () => {
  const tree = renderer.create(<SignalDetails signal={signalFixture} />).toJSON();
  const text = JSON.stringify(tree);
  expect(text).toContain('BTCUSDT');
  expect(text).toContain('quantitative spot-market signals');
});

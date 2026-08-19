import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {SignalDetails} from './SignalDetails';
import {signalFixture} from '../__tests__/fixtures';

it('renders signal details and quantitative disclaimer', async () => {
  let component: import('react-test-renderer').ReactTestRenderer;
  await act(async () => { component = renderer.create(<SignalDetails signal={signalFixture} />); });
  const text = JSON.stringify(component!.toJSON());
  expect(text).toContain('BTCUSDT');
  expect(text).toContain('quantitative spot-market signals');
});

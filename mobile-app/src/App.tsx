import React, {useState} from 'react';
import {SafeAreaView, StatusBar} from 'react-native';
import {colors} from './constants/theme';
import {SignalDashboard} from './screens/SignalDashboard';
import {SignalDetails} from './screens/SignalDetails';
import {Signal} from './types/signal';

const App = (): React.JSX.Element => {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  return (
    <SafeAreaView style={{backgroundColor: colors.background, flex: 1}}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {selectedSignal ? <SignalDetails signal={selectedSignal} /> : <SignalDashboard onSelectSignal={setSelectedSignal} />}
    </SafeAreaView>
  );
};

export default App;

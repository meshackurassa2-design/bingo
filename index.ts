import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';

const ErrorFallback = ({ error }: { error: any }) => {
  return React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: '#b91c1c', padding: 20 } },
    React.createElement(ScrollView, null,
      React.createElement(Text, { style: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 } }, "FATAL APP CRASH"),
      React.createElement(Text, { style: { color: 'white', fontSize: 16, marginBottom: 20 } }, "Please screenshot this and show it to the AI:"),
      React.createElement(Text, { style: { color: 'white', fontFamily: 'monospace', fontSize: 12 } }, error?.name + ": " + error?.message),
      React.createElement(Text, { style: { color: '#fca5a5', fontFamily: 'monospace', fontSize: 10, marginTop: 10 } }, error?.stack || JSON.stringify(error))
    )
  );
};

let fatalError: any = null;

if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    fatalError = error;
  });
}

import App from './App';

class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError || fatalError) {
      return React.createElement(ErrorFallback, { error: this.state.error || fatalError });
    }
    return this.props.children;
  }
}

const RootApp = () => {
  return React.createElement(ErrorBoundary, null, React.createElement(App, null));
};

registerRootComponent(RootApp);


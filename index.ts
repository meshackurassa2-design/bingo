import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';

const ErrorFallback = ({ error }: { error: any }) => {
  return React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: '#b91c1c', padding: 40, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 99999 } },
    React.createElement(ScrollView, null,
      React.createElement(Text, { style: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 } }, "FATAL APP CRASH"),
      React.createElement(Text, { style: { color: 'white', fontSize: 16, marginBottom: 20 } }, "Please screenshot this and show it to the AI:"),
      React.createElement(Text, { style: { color: 'white', fontFamily: 'monospace', fontSize: 12 } }, error?.name + ": " + error?.message),
      React.createElement(Text, { style: { color: '#fca5a5', fontFamily: 'monospace', fontSize: 10, marginTop: 10 } }, error?.stack || String(error))
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
  return React.createElement(ErrorBoundary, null, 
    React.createElement(View, { style: { flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' } },
      React.createElement(Text, { style: { color: 'white', fontSize: 30, fontWeight: 'bold', textAlign: 'center' } }, "APP IS ALIVE!"),
      React.createElement(Text, { style: { color: 'white', fontSize: 16, marginTop: 20, textAlign: 'center' } }, "If you see this red screen, the JS engine works perfectly. The black screen was caused by something inside App.tsx or React Navigation.")
    )
  );
};

registerRootComponent(RootApp);


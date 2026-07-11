import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';

// Global error catcher for fatal JS errors before React mounts
const ErrorFallback = ({ error }: { error: any }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#b91c1c', padding: 20 }}>
    <ScrollView>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>FATAL APP CRASH</Text>
      <Text style={{ color: 'white', fontSize: 16, marginBottom: 20 }}>Please screenshot this and show it to the AI:</Text>
      <Text style={{ color: 'white', fontFamily: 'monospace', fontSize: 12 }}>
        {error?.name}: {error?.message}
      </Text>
      <Text style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 10, marginTop: 10 }}>
        {error?.stack || JSON.stringify(error)}
      </Text>
    </ScrollView>
  </SafeAreaView>
);

let fatalError: any = null;

if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    fatalError = error;
    // We try to trigger a re-render if it's already mounted, but if not, the wrapper will catch it.
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
      return <ErrorFallback error={this.state.error || fatalError} />;
    }
    return this.props.children;
  }
}

const RootApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

registerRootComponent(RootApp);


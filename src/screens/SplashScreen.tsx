import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Fade in and scale up the logo slightly
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]),
      // 2. Pause for a moment to let the user see it
      Animated.delay(800),
      // 3. Zoom into the logo massively and fade the whole screen to black
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 50, // Zoom way in!
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      <Animated.Text 
        style={[
          styles.logo, 
          { 
            opacity,
            transform: [{ scale }]
          }
        ]}
      >
        BONGOFLIX
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logo: {
    color: '#E50914',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(229, 9, 20, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  }
});

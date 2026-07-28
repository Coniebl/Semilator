import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export default function BootloadScreen() {
  const { width, height } = useWindowDimensions();
  const opacityAnim = useRef(new Animated.Value(0.4)).current;
  
  // Optional: scale the container if window is smaller than 800x480
  const scale = Math.min(width / 800, height / 480, 1);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [opacityAnim]);

  const handlePress = () => {
    router.replace('/pairing');
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/tabIcons/logo.png')} 
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <Text style={styles.title}>SEMILATOR</Text>
        <Animated.Text style={[styles.subtitle, { opacity: opacityAnim }]}>
          Tap anywhere to continue
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: 800,
    height: 480,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16, // small gap to keep items clustered but not overlapping
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 304,
    tintColor: '#093c5d',
  },
  title: {
    fontFamily: 'Syncopate_700Bold',
    fontSize: 64,
    color: '#093c5d',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 24,
    color: '#3b7597',
    textAlign: 'center',
  }
});

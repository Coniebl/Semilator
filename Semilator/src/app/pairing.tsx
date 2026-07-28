import QRCode from 'react-native-qrcode-svg';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

export default function PairingScreen() {
  const { width, height } = useWindowDimensions();
  const [pairingCode, setPairingCode] = useState("000000");
  
  // Optional: scale the container if window is smaller than 800x480
  const scale = Math.min(width / 800, height / 480, 1);

  useEffect(() => {
    // Generate random 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(code);
  }, []);

  const handleSimulateConnection = () => {
    // Randomly pick buyer or seller and a username
    const roles = ['buyer', 'seller'];
    const names = ['John', 'Alice', 'Mike', 'Sarah'];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const randomName = names[Math.floor(Math.random() * names.length)];
    router.replace(`/dashboard?role=${randomRole}&username=${randomName}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { transform: [{ scale }] }]}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>Use your phone to link the Semilator</Text>
        </View>

        <View style={styles.qrContainer}>
          <QRCode
            value={pairingCode}
            size={180}
            color="black"
            backgroundColor="white"
          />
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{pairingCode}</Text>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.simulateBtn, pressed && { opacity: 0.7 }]} 
          onPress={handleSimulateConnection}
        >
          <Text style={styles.simulateBtnText}>Simulate Connection</Text>
        </Pressable>
      </View>
    </View>
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
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Roboto_700Bold', 
    fontSize: 48,
    color: '#000000',
  },
  subtitle: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 22,
    color: '#3b7597',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    backgroundColor: '#D9D9D9',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
    minWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 36,
    color: '#000000',
    letterSpacing: 2,
  },
  simulateBtn: {
    marginTop: 10,
    backgroundColor: '#3b7597',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  simulateBtnText: {
    color: 'white',
    fontFamily: 'Roboto_700Bold',
    fontSize: 16,
  }
});

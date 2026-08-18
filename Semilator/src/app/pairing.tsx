import QRCode from 'react-native-qrcode-svg';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function PairingScreen() {
  const { width, height } = useWindowDimensions();
  const [pairingCode, setPairingCode] = useState("000000");
  
  // Optional: scale the container if window is smaller than 800x480
  const scale = Math.min(width / 800, height / 480, 1);

  useEffect(() => {
    let channel: any;

    const initPairing = async () => {
      // Generate random 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(code);

      // Insert session to DB
      const { error } = await supabase.from('pairing_sessions').insert({ code, status: 'pending' });
      if (error) {
        console.error("Failed to create pairing session:", error);
      }

      // Listen for pairing event
      channel = supabase
        .channel(`pairing_${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pairing_sessions', filter: `code=eq.${code}` }, async (payload) => {
          if (payload.new.status === 'paired' && payload.new.paired_user_id) {
            // Fetch user profile
            const { data, error } = await supabase.from('profiles').select('*').eq('id', payload.new.paired_user_id).single();
            if (data) {
              router.replace(`/dashboard?role=${data.role}&username=${data.username}&userId=${data.id}`);
            } else {
              console.error("Failed to fetch user profile", error);
            }
          }
        })
        .subscribe();
    };

    initPairing();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const simulateScan = async (role: 'buyer' | 'seller') => {
    const userId = role === 'buyer' 
      ? '11111111-1111-1111-1111-111111111111' 
      : '22222222-2222-2222-2222-222222222222';
    
    const { error } = await supabase
      .from('pairing_sessions')
      .update({ status: 'paired', paired_user_id: userId })
      .eq('code', pairingCode);
      
    if (error) {
      console.error("Simulation failed:", error);
      Alert.alert("Error", "Could not simulate connection.");
    }
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

        <View style={styles.simulateButtonsRow}>
          <Pressable 
            style={({ pressed }) => [styles.simulateBtn, pressed && { opacity: 0.7 }]} 
            onPress={() => simulateScan('buyer')}
          >
            <Text style={styles.simulateBtnText}>Simulate Buyer</Text>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [styles.simulateBtn, styles.simulateBtnSeller, pressed && { opacity: 0.7 }]} 
            onPress={() => simulateScan('seller')}
          >
            <Text style={styles.simulateBtnText}>Simulate Seller</Text>
          </Pressable>
        </View>
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
  simulateButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  simulateBtn: {
    backgroundColor: '#3b7597',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  simulateBtnSeller: {
    backgroundColor: '#0EA40E',
  },
  simulateBtnText: {
    color: 'white',
    fontFamily: 'Roboto_700Bold',
    fontSize: 16,
  }
});

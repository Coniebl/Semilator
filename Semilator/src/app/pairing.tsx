import QRCode from 'react-native-qrcode-svg';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const generateCode = () => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function PairingScreen() {
  const { width, height } = useWindowDimensions();
  const [pairingCode, setPairingCode] = useState("0000000");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  
  // Optional: scale the container if window is smaller than 800x480
  const scale = Math.min(width / 800, height / 480, 1);

  useEffect(() => {
    let channel: any;
    let code: string;

    const initPairing = async () => {
      code = generateCode();
      setPairingCode(code);

      // Insert session to DB
      const { error } = await supabase.from('pairing_sessions').insert({ code, status: 'pending' });
      if (error) {
        console.error("Failed to create pairing session:", error);
      }

      // Listen for pairing event
      channel = supabase
        .channel(`pairing_${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pairing_sessions', filter: `code=eq.${code}` }, (payload) => {
          const { seller_id, buyer_id, paired_user_id } = payload.new;
          
          let currentSellerId = seller_id;
          let currentBuyerId = buyer_id;

          // Fallback for the current mobile app which hasn't been updated to use seller_id/buyer_id yet.
          // We will assume the old paired_user_id update is a buyer for testing purposes.
          if (paired_user_id && !currentBuyerId) {
            currentBuyerId = paired_user_id;
          }
          
          if (currentSellerId) setSellerId(currentSellerId);
          if (currentBuyerId) setBuyerId(currentBuyerId);
          
          if (currentSellerId && currentBuyerId) {
             // Add a delay before navigating so the user can see the 'B' circle turn green
             setTimeout(() => {
               router.replace(`/dashboard?sellerId=${currentSellerId}&buyerId=${currentBuyerId}`);
             }, 800);
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

  const handleProceedWithoutBuyer = () => {
    if (sellerId) {
      router.replace(`/dashboard?sellerId=${sellerId}`);
    }
  };

  const simulateScan = async (role: 'buyer' | 'seller') => {
    // Dynamically fetch a user with the corresponding role from the database
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', role)
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      console.error("Could not find a profile for role:", role);
      Alert.alert("Simulation Error", `No user found in the database with role: ${role}`);
      return;
    }

    const userId = profiles[0].id;
    
    const updateData: any = {};
    if (role === 'buyer') {
      updateData.buyer_id = userId;
      if (sellerId) updateData.status = 'paired';
    } else {
      updateData.seller_id = userId;
      if (buyerId) updateData.status = 'paired';
    }
    
    const { error } = await supabase
      .from('pairing_sessions')
      .update(updateData)
      .eq('code', pairingCode);
      
    if (error) {
      console.error("Simulation failed:", error);
      Alert.alert("Error", "Could not simulate connection.");
    }
  };

  const handleScreenTap = () => {
    if (!sellerId) {
      simulateScan('seller');
    } else if (!buyerId) {
      simulateScan('buyer');
    }
  };

  const codeDisplay = pairingCode.split('').join(' ');

  return (
    <Pressable style={styles.container} onPress={handleScreenTap}>
      <View style={[styles.content, { transform: [{ scale }] }]}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>Use your phone to link the Semilator</Text>
        </View>

        <View style={styles.qrRow}>
          <View style={[styles.circle, sellerId ? styles.circleActive : styles.circleInactive]}>
            <Text style={[styles.circleText, sellerId ? styles.circleTextActive : null]}>S</Text>
          </View>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={pairingCode}
              size={180}
              color="black"
              backgroundColor="white"
            />
          </View>

          <View style={[styles.circle, buyerId ? styles.circleActive : styles.circleInactive]}>
            <Text style={[styles.circleText, buyerId ? styles.circleTextActive : null]}>B</Text>
          </View>
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{codeDisplay}</Text>
        </View>

        {sellerId && !buyerId && (
          <Pressable style={styles.proceedButton} onPress={handleProceedWithoutBuyer}>
            <Text style={styles.proceedButtonText}>Proceed without Buyer</Text>
          </Pressable>
        )}

        {/* Keeping explicit buttons just in case, but they are hidden for now or we can remove them. I'll remove them since screen tap does the job. */}
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
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
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
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 64,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  circleInactive: {
    borderColor: '#D9D9D9',
  },
  circleActive: {
    borderColor: '#10B981', // green color from the image
    backgroundColor: '#10B981',
  },
  circleText: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 36,
    color: '#000000',
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  codeContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D9D9',
    borderWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 36,
    color: '#000000',
    letterSpacing: 4,
  },
  proceedButton: {
    backgroundColor: '#3b7597',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  proceedButtonText: {
    color: 'white',
    fontFamily: 'Roboto_700Bold',
    fontSize: 16,
  },
  simulateButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    position: 'absolute',
    bottom: 24,
    left: 24,
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

import QRCode from 'react-native-qrcode-svg';
import { useEffect, useState, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, Alert, Animated, Easing } from 'react-native';
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

const ConnectionCircle = ({ label, isActive }: { label: string, isActive: boolean }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && status === 'idle') {
      setStatus('loading');
      
      const loopAnim = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopAnim.start();

      setTimeout(() => {
        loopAnim.stop();
        setStatus('success');
        
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
        ]).start();
        
      }, 1000); // 1 second loading animation
    }
  }, [isActive, status, rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View style={[
      styles.circle,
      status === 'success' ? styles.circleActive : styles.circleInactive,
      status === 'loading' && { borderTopColor: '#10B981', borderRightColor: '#10B981' },
      { transform: [{ rotate: status === 'loading' ? spin : '0deg' }, { scale: scaleAnim }] }
    ]}>
      {status === 'success' ? (
         <Text style={[styles.circleText, styles.circleTextActive]}>✔</Text>
      ) : (
         <Animated.Text style={[
           styles.circleText,
           { transform: [{ rotate: status === 'loading' ? rotateAnim.interpolate({
             inputRange: [0, 1],
             outputRange: ['0deg', '-360deg']
           }) : '0deg' }] }
         ]}>
           {label}
         </Animated.Text>
      )}
    </Animated.View>
  );
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
             // Add a delay before navigating so the user can see the checkmark animation finish
             setTimeout(() => {
               router.replace(`/dashboard?sellerId=${currentSellerId}&buyerId=${currentBuyerId}`);
             }, 2000);
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

  const handleScreenTap = () => {
    if (!sellerId && !buyerId) {
      setSellerId('sim-seller');
      setBuyerId('sim-buyer');
      
      setTimeout(() => {
        router.replace('/dashboard');
      }, 2000);
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
          <ConnectionCircle label="S" isActive={!!sellerId} />
          
          <View style={styles.qrContainer}>
            <QRCode
              value={pairingCode}
              size={180}
              color="black"
              backgroundColor="white"
            />
          </View>

          <ConnectionCircle label="B" isActive={!!buyerId} />
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{codeDisplay}</Text>
        </View>

        {sellerId && !buyerId && (
          <Pressable style={styles.proceedButton} onPress={handleProceedWithoutBuyer}>
            <Text style={styles.proceedButtonText}>Proceed without Buyer</Text>
          </Pressable>
        )}

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
    borderColor: '#10B981', 
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
  }
});

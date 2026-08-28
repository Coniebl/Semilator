import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, useWindowDimensions, Animated, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';

const CustomFish = ({ translateY, opacity }: { translateY: any, opacity: any }) => (
  <Animated.View style={{ opacity, transform: [{ translateY }], marginHorizontal: -4 }}>
    <Svg width="40" height="28" viewBox="0 0 100 100">
      <Path d="M 20 50 L 5 25 L 15 50 L 5 75 Z" fill="#1A365D" />
      <Path d="M 35 30 L 45 5 L 55 25 Z" fill="#1A365D" />
      <Path d="M 40 70 L 45 90 L 55 75 L 60 85 L 65 70 Z" fill="#1A365D" />
      <Path d="M 15 50 C 15 80, 85 80, 95 50 C 85 20, 15 20, 15 50 Z" fill="#1A365D" />
      <Circle cx="80" cy="45" r="5" fill="#FFFFFF" />
      <Circle cx="82" cy="45" r="2" fill="#1A365D" />
      <Path d="M 70 35 C 75 45, 75 55, 70 65" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      <Path d="M 45 50 C 55 55, 60 65, 50 65 C 55 60, 50 55, 45 50 Z" fill="#FFFFFF" />
      <Path d="M 25 65 L 35 75 L 30 65 Z" fill="#FFFFFF" />
    </Svg>
  </Animated.View>
);

const FishAnimation = ({ isRunning }: { isRunning: boolean }) => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isRunning) {
      anim1.setValue(0);
      anim2.setValue(0);
      anim3.setValue(0);
      return;
    }

    const createBounce = (anim: Animated.Value) => 
      Animated.sequence([
        Animated.timing(anim, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]);

    const loopAnim = Animated.loop(
      Animated.stagger(150, [
        createBounce(anim1),
        createBounce(anim2),
        createBounce(anim3)
      ])
    );
    loopAnim.start();
    
    return () => {
      loopAnim.stop();
      anim1.setValue(0);
      anim2.setValue(0);
      anim3.setValue(0);
    };
  }, [anim1, anim2, anim3, isRunning]);

  const op = isRunning ? 1 : 0.4;

  return (
    <View style={{ flexDirection: 'row', marginHorizontal: 8, paddingVertical: 4 }}>
      <CustomFish translateY={anim1} opacity={op} />
      <CustomFish translateY={anim2} opacity={op} />
      <CustomFish translateY={anim3} opacity={op} />
    </View>
  );
};

const ProfileAvatar = ({ imageUrl, style }: { imageUrl?: string, style?: any }) => {
  return (
    <View style={[styles.profilePicContainer, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.profilePicImage} />
      ) : (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      )}
    </View>
  );
};

export default function DashboardScreen() {
  const { sellerId, buyerId, sellerPicUrl, buyerPicUrl } = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  
  const [sellerName, setSellerName] = useState('Seller1');
  const [buyerName, setBuyerName] = useState('Buyer1');

  useEffect(() => {
    const fetchProfiles = async () => {
      if (sellerId) {
        const { data } = await supabase.from('profiles').select('username').eq('id', sellerId).single();
        if (data) setSellerName(data.username || 'Seller1');
      }
      if (buyerId) {
         const { data } = await supabase.from('profiles').select('username').eq('id', buyerId).single();
         if (data) setBuyerName(data.username || 'Buyer1');
      } else {
         // If we arrived here without a buyer via scanning, but from simulation or bypass
         if (!sellerId && !buyerId) {
            setSellerName('Seller1');
            setBuyerName('Buyer1');
         } else {
            setBuyerName('Anonymous');
         }
      }
    };
    fetchProfiles();
  }, [sellerId, buyerId]);

  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const yyyy = now.getFullYear();
      const HH = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${mm}/${dd}/${yyyy} ${HH}:${min}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [targetStr, setTargetStr] = useState('');
  const target = parseInt(targetStr) || 0;
  const [priceStr, setPriceStr] = useState('');
  const pricePerPiece = parseFloat(priceStr) || 0;
  const [counted, setCounted] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const total = counted * pricePerPiece;

  const [verification, setVerification] = useState({ vision: 0, sensor3: 0, thermal: 0, final: 0, show: false });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startOfToday.toISOString())
        .order('created_at', { ascending: false });
      
      if (data) {
        const mapped = data.map(item => {
          const d = new Date(item.created_at);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const yyyy = d.getFullYear();
          const HH = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          return {
            id: item.id,
            count: item.count,
            amount: item.amount,
            date: `${mm}/${dd}/${yyyy} ${HH}:${min}`,
            buyerName: buyerName
          };
        });
        setHistory(mapped);
      }
    };
    fetchHistory();
  }, [buyerName]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setCounted(prev => {
          if (prev >= target - 1) {
            setIsRunning(false);
            const finalCount = target;
            
            const rand = Math.random();
            let v = target;
            let s3 = target;
            let t = target;

            if (rand < 0.34) {
               // All match
            } else if (rand < 0.67) {
               // Two match
               const diffAmount = Math.floor(Math.random() * 5) + 1;
               const pick = Math.floor(Math.random() * 3);
               if (pick === 0) v = Math.max(0, target - diffAmount);
               else if (pick === 1) s3 = Math.max(0, target - diffAmount);
               else t = Math.max(0, target - diffAmount);
            } else {
               // None match
               const diff1 = Math.floor(Math.random() * 3) + 1;
               const diff2 = diff1 + Math.floor(Math.random() * 3) + 1;
               const pickTarget = Math.floor(Math.random() * 3);
               if (pickTarget === 0) {
                 s3 = Math.max(0, target - diff1);
                 t = Math.max(0, target - diff2);
               } else if (pickTarget === 1) {
                 v = Math.max(0, target - diff1);
                 t = Math.max(0, target - diff2);
               } else {
                 v = Math.max(0, target - diff1);
                 s3 = Math.max(0, target - diff2);
               }
            }

            const counts = [v, s3, t];
            const freq: any = {};
            let maxFreq = 0;
            let majorityVal: number | null = null;
            counts.forEach(val => {
               freq[val] = (freq[val] || 0) + 1;
               if (freq[val] > maxFreq) {
                 maxFreq = freq[val];
                 majorityVal = val;
               }
            });

            let finalVerified = 0;
            if (maxFreq >= 2 && majorityVal !== null) {
               finalVerified = majorityVal;
            } else {
               finalVerified = Math.round((v + s3 + t) / 3);
            }

            setVerification({ vision: v, sensor3: s3, thermal: t, final: finalVerified, show: true });

            const finalTotal = finalVerified * pricePerPiece;

            const validUserId = (sellerId && String(sellerId).length === 36) ? sellerId : '00000000-0000-0000-0000-000000000000';

            supabase.from('transactions').insert({
              user_id: validUserId,
              count: finalVerified,
              amount: finalTotal
            }).select().single().then(({ data, error }) => {
              if (error) {
                console.error("Supabase insert error:", error);
              }
              if (data) {
                const now = new Date(data.created_at);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const yyyy = now.getFullYear();
                const HH = String(now.getHours()).padStart(2, '0');
                const min = String(now.getMinutes()).padStart(2, '0');
                const dateStr = `${mm}/${dd}/${yyyy} ${HH}:${min}`;
                
                setHistory(h => [{
                  id: data.id,
                  count: data.count,
                  amount: data.amount,
                  date: dateStr,
                  buyerName: buyerName
                }, ...h]);
              }
            });

            return finalCount;
          }
          return prev + 1;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning, target, sellerId, pricePerPiece, buyerName]);

  const handleNewTransaction = () => {
    if (!isRunning && target > 0) {
      setCounted(0);
      setVerification({ ...verification, show: false });
      setIsRunning(true);
    }
  };

  const handleClear = () => {
    setCounted(0);
    setVerification({ ...verification, show: false });
    setIsRunning(false);
    setTargetStr('');
    setPriceStr('');
  };

  const handleDone = () => {
    router.replace('/');
  };

  const handleDeleteHistory = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const renderLeftActions = (id: string) => (
    <View style={styles.deleteAction}>
      <Pressable style={styles.deleteBtn} onPress={() => handleDeleteHistory(id)}>
        <Text style={styles.deleteBtnText}>Delete</Text>
      </Pressable>
    </View>
  );

  const scale = Math.min(width / 800, height / 480, 1);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { transform: [{ scale }] }]}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ProfileAvatar imageUrl={sellerPicUrl as string} />
            <Text style={styles.headerTitle}>{sellerName}</Text>
            
            <FishAnimation isRunning={isRunning} />
            
            <ProfileAvatar imageUrl={buyerPicUrl as string} style={{ marginLeft: 8 }} />
            <Text style={styles.headerTitle}>{buyerName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTime}>{timeStr}</Text>
            <Pressable style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>DONE</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.panelsContainer}>
          {/* Left Panel: LIVE COUNT */}
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle}>LIVE COUNT</Text>
            
            <View style={styles.countCard}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.countNumber}>
                {String(counted).padStart(4, '0')}
              </Text>
              <Text style={styles.countLabel}>Fingerlings</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Target:</Text>
              <TextInput 
                style={[styles.inputValue, isRunning && styles.inputDisabled]}
                value={targetStr}
                onChangeText={setTargetStr}
                keyboardType="number-pad"
                editable={!isRunning}
                maxLength={5}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Price per piece:</Text>
              <TextInput 
                style={[styles.inputValue, isRunning && styles.inputDisabled]}
                value={priceStr}
                onChangeText={setPriceStr}
                keyboardType="decimal-pad"
                editable={!isRunning}
                maxLength={5}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Total:</Text>
              <Text style={styles.totalValue}>₱ {total.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.actionButtons}>
              <Pressable style={styles.clearBtn} onPress={handleClear} disabled={isRunning}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable style={[styles.newTransactionBtn, isRunning && { opacity: 0.7 }]} onPress={handleNewTransaction} disabled={isRunning}>
                <Text style={styles.newTransactionBtnText}>{isRunning ? 'Counting...' : (verification.show ? 'New Transaction' : 'Count')}</Text>
              </Pressable>
            </View>
          </View>

          {/* Right Panels */}
          <View style={styles.rightPanels}>
            {/* Top Right: VERIFICATION */}
            <View style={styles.verificationPanel}>
              <Text style={styles.panelTitle}>COUNTING VERIFICATION DETAILS</Text>
              <View style={styles.verificationGrid}>
                {/* Vision Box */}
                <View style={[styles.veriBox, verification.show && { borderColor: verification.vision === verification.final ? '#3ce83c' : '#e83c3c' }]}>
                  <Text style={styles.veriBoxLabel}>Vision</Text>
                  <Text style={styles.veriBoxValue}>{verification.show ? verification.vision : '---'}</Text>
                </View>
                {/* Sensor 3 Box */}
                <View style={[styles.veriBox, verification.show && { borderColor: verification.sensor3 === verification.final ? '#3ce83c' : '#e83c3c' }]}>
                  <Text style={styles.veriBoxLabel}>Sensor 3</Text>
                  <Text style={styles.veriBoxValue}>{verification.show ? verification.sensor3 : '---'}</Text>
                </View>
                {/* Thermal Box */}
                <View style={[styles.veriBox, verification.show && { borderColor: verification.thermal === verification.final ? '#3ce83c' : '#e83c3c' }]}>
                  <Text style={styles.veriBoxLabel}>Thermal</Text>
                  <Text style={styles.veriBoxValue}>{verification.show ? verification.thermal : '---'}</Text>
                </View>
                {/* Final Box */}
                <View style={[styles.veriFinalBox, verification.show && { backgroundColor: '#3ce83c' }]}>
                  <Text style={styles.veriBoxLabel}>Final</Text>
                  <Text style={styles.veriFinalValue}>{verification.show ? verification.final : '---'}</Text>
                </View>
              </View>
            </View>

            {/* Bottom Right: HISTORY */}
            <View style={styles.historyPanel}>
              <Text style={styles.panelTitle}>DAILY TRANSACTION HISTORY</Text>
              <ScrollView style={styles.historyList}>
                {history.map((item, index) => (
                  <Swipeable key={item.id} renderLeftActions={() => renderLeftActions(item.id)}>
                    <View style={styles.historyCard}>
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>{history.length - index}</Text>
                      </View>
                      <View style={styles.historyContent}>
                        <View style={styles.historyHeaders}>
                          <Text style={styles.historyColHeader}>TO</Text>
                          <Text style={styles.historyColHeader}>COUNT</Text>
                          <Text style={styles.historyColHeader}>AMOUNT</Text>
                        </View>
                        <View style={styles.historyValues}>
                          <Text style={[styles.historyColValue, { color: '#0088ff' }]}>{item.buyerName || 'Buyer'}</Text>
                          <Text style={[styles.historyColValue, { color: '#1eb81e' }]}>{item.count}</Text>
                          <Text style={[styles.historyColValue, { color: '#d0c326' }]}>₱ {parseFloat(item.amount || 0).toFixed(2)}</Text>
                        </View>
                        <Text style={styles.historyDate}>{item.date}</Text>
                      </View>
                    </View>
                  </Swipeable>
                ))}
                <Text style={styles.oldEntriesText}>Old entries in app</Text>
              </ScrollView>
            </View>
          </View>
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
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9a9794',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePicImage: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTime: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 16,
    color: '#000000',
  },
  doneBtn: {
    backgroundColor: '#BA2A23',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  doneBtnText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  panelsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#8C8885',
    borderRadius: 12,
    padding: 16,
  },
  rightPanels: {
    flex: 1.1,
    flexDirection: 'column',
    gap: 12,
  },
  verificationPanel: {
    flex: 1,
    backgroundColor: '#8C8885',
    borderRadius: 12,
    padding: 16,
  },
  historyPanel: {
    flex: 1.2,
    backgroundColor: '#8C8885',
    borderRadius: 12,
    padding: 12,
  },
  panelTitle: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  countCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  countNumber: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 56,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 62,
  },
  countLabel: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  divider: {
    height: 2,
    backgroundColor: '#FFFFFF',
    marginVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputValue: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    width: 90,
    height: 32,
  },
  inputDisabled: {
    borderColor: 'transparent',
    backgroundColor: '#9a9794',
    opacity: 0.8,
  },
  totalValue: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: 4,
  },
  clearBtn: {
    backgroundColor: '#BA2A23',
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.45,
    alignItems: 'center',
  },
  clearBtnText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newTransactionBtn: {
    backgroundColor: '#0EA40E',
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.52,
    alignItems: 'center',
  },
  newTransactionBtnText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  verificationGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  veriBox: {
    width: '48%',
    height: '46%',
    backgroundColor: '#E8E8E8',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  veriBoxLabel: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    position: 'absolute',
    top: 4,
    left: 8,
  },
  veriBoxValue: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginTop: 12,
  },
  veriFinalBox: {
    width: '48%',
    height: '46%',
    backgroundColor: '#A9A5A2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  veriFinalValue: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginTop: 12,
  },
  historyList: {
    flex: 1,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    marginBottom: 8,
  },
  historyBadge: {
    backgroundColor: '#BA2A23',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
  },
  historyBadgeText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyContent: {
    flex: 1,
    padding: 8,
  },
  historyHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  historyColHeader: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  historyValues: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  historyColValue: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyDate: {
    fontFamily: 'Roboto_700Bold',
    textAlign: 'center',
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  oldEntriesText: {
    fontFamily: 'Roboto_700Bold',
    textAlign: 'center',
    color: '#666666',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
  },
  deleteBtn: {
    backgroundColor: '#BA2A23',
    justifyContent: 'center',
    alignItems: 'center',
    width: 65,
    height: '100%',
    borderRadius: 8,
  },
  deleteBtnText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});

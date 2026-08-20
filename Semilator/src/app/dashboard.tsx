import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';

// --- Subcomponents for Buyer ---
const BuyerDashboard = ({ userId }: { userId: string }) => {
  const [expectedStr, setExpectedStr] = useState('0');
  const expected = parseInt(expectedStr) || 0;
  const [counted, setCounted] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const remaining = Math.max(0, expected - counted);

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) {
            const mapped = data.map(item => {
              const d = new Date(item.created_at);
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const yyyy = d.getFullYear();
              const HH = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              const diff = item.count - (item.expected || 0);
              let color = '#1eb81e';
              if (diff !== 0) color = '#d31f1f';
              
              return {
                id: item.id,
                count: item.count,
                expected: item.expected,
                status: item.status,
                date: `${mm}/${dd}/${yyyy} • ${HH}:${min}`,
                color
              };
            });
            setHistory(mapped);
          }
        });
    }
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setCounted(prev => {
          if (prev >= targetCount - 1) {
            setIsRunning(false);
            
            const diff = targetCount - expected;
            let statusStr = 'correct';
            let statusColor = '#1eb81e';
            if (diff > 0) {
               statusStr = `+${diff}`;
               statusColor = '#d31f1f';
            } else if (diff < 0) {
               statusStr = `${diff}`;
               statusColor = '#d31f1f';
            }
            
            // Save to DB
            supabase.from('transactions').insert({
              user_id: userId,
              count: targetCount,
              expected: expected,
              status: statusStr
            }).select().single().then(({ data }) => {
              if (data) {
                const now = new Date(data.created_at);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const yyyy = now.getFullYear();
                const HH = String(now.getHours()).padStart(2, '0');
                const min = String(now.getMinutes()).padStart(2, '0');
                const dateStr = `${mm}/${dd}/${yyyy} • ${HH}:${min}`;
                
                setHistory(h => [{
                  id: data.id,
                  count: data.count,
                  expected: data.expected,
                  status: data.status,
                  date: dateStr,
                  color: statusColor
                }, ...h]);
              }
            });

            return targetCount;
          }
          return prev + 1;
        });
      }, 300); // slowed down simulation
    }
    return () => clearInterval(interval);
  }, [isRunning, expected, targetCount, userId]);

  const handleDeleteHistory = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const renderLeftActions = (id: string) => {
    return (
      <View style={styles.deleteAction}>
        <Pressable style={styles.deleteBtn} onPress={() => handleDeleteHistory(id)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  const handleStart = () => {
    if (!isRunning && expected > 0) {
      if (counted > 0) setCounted(0);
      
      const rand = Math.random();
      let newTarget = expected;
      if (rand < 0.25) {
        // missing fish (1 to 5 less)
        newTarget = Math.max(0, expected - Math.floor(Math.random() * 5 + 1));
      } else if (rand > 0.75) {
        // excess fish (1 to 5 more)
        newTarget = expected + Math.floor(Math.random() * 5 + 1);
      }
      
      setTargetCount(newTarget);
      
      if (newTarget === 0) {
        // instant finish if target is 0
        setCounted(0);
      } else {
        setIsRunning(true);
      }
    }
  };

  return (
    <View style={styles.dashboardLayout}>
      {/* Left Panel */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>VERIFYING COUNT</Text>
        <View style={styles.largeCard}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.largeCardNumber}>{String(remaining).padStart(4, '0')}</Text>
          <Text style={styles.largeCardLabel}>Remaining</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Expected:</Text>
            <TextInput 
              style={[styles.statValue, styles.input, isRunning && styles.inputDisabled]}
              value={expectedStr}
              onChangeText={setExpectedStr}
              editable={!isRunning}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Counted:</Text>
            <Text style={styles.statValue}>{String(counted).padStart(5, '0')}</Text>
          </View>
          <View style={styles.divider} />
        </View>

        <Pressable 
          style={({pressed}) => [styles.button, styles.btnGreen, { marginTop: 'auto' }, pressed && !isRunning && { opacity: 0.7 }, isRunning && { opacity: 0.9 }]}
          onPress={handleStart}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>{isRunning ? 'Counting... Wait for result' : 'Start Counting'}</Text>
        </Pressable>
      </View>

      {/* Right Panel */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>VERIFICATION HISTORY</Text>
        <ScrollView style={styles.historyList}>
          {history.map((item, index) => (
            <Swipeable key={item.id} renderLeftActions={() => renderLeftActions(item.id)}>
              <View style={styles.historyCardWrapper}>
                <View style={styles.historyBadge}><Text style={styles.historyBadgeText}>{history.length - index}</Text></View>
                <View style={styles.historyCard}>
                  <View style={styles.historyCardColumns}>
                    <View style={styles.historyCol}>
                      <Text style={styles.historyColLabel}>COUNT</Text>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.historyColVal, { color: '#2b7a15' }]}>{item.count}</Text>
                    </View>
                    <View style={styles.historyCol}>
                      <Text style={styles.historyColLabel}>EXPECTED</Text>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.historyColVal, { color: '#ded728' }]}>{item.expected}</Text>
                    </View>
                    <View style={styles.historyCol}>
                      <Text style={styles.historyColLabel}>STATUS</Text>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.historyColVal, { color: item.color }]}>{item.status}</Text>
                    </View>
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
  );
};

// --- Subcomponents for Seller ---
const SellerDashboard = ({ userId }: { userId: string }) => {
  const [targetStr, setTargetStr] = useState('100');
  const target = parseInt(targetStr) || 0;
  
  const [priceStr, setPriceStr] = useState('2.50');
  const pricePerPiece = parseFloat(priceStr) || 0;
  
  const [counted, setCounted] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const total = counted * pricePerPiece;
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
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
                date: `${mm}/${dd}/${yyyy} • ${HH}:${min}`
              };
            });
            setHistory(mapped);
          }
        });
    }
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setCounted(prev => {
          if (prev >= targetCount - 1) {
            setIsRunning(false);
            const finalCount = targetCount;
            const finalTotal = finalCount * pricePerPiece;

            // Save to DB
            supabase.from('transactions').insert({
              user_id: userId,
              count: finalCount,
              amount: finalTotal
            }).select().single().then(({ data }) => {
              if (data) {
                const now = new Date(data.created_at);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const yyyy = now.getFullYear();
                const HH = String(now.getHours()).padStart(2, '0');
                const min = String(now.getMinutes()).padStart(2, '0');
                const dateStr = `${mm}/${dd}/${yyyy} • ${HH}:${min}`;
                
                setHistory(h => [{
                  id: data.id,
                  count: data.count,
                  amount: data.amount,
                  date: dateStr
                }, ...h]);
              }
            });

            return targetCount;
          }
          return prev + 1;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isRunning, targetCount, userId, pricePerPiece]);

  const handleDeleteHistory = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const renderLeftActions = (id: string) => {
    return (
      <View style={styles.deleteAction}>
        <Pressable style={styles.deleteBtn} onPress={() => handleDeleteHistory(id)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  const handleStart = () => {
    if (!isRunning && target > 0) {
      if (counted > 0) setCounted(0);
      
      const rand = Math.random();
      let newTarget = target;
      if (rand < 0.25) {
        newTarget = Math.max(0, target - Math.floor(Math.random() * 5 + 1));
      } else if (rand > 0.75) {
        newTarget = target + Math.floor(Math.random() * 5 + 1);
      }
      
      setTargetCount(newTarget);
      
      if (newTarget === 0) {
        setCounted(0);
      } else {
        setIsRunning(true);
      }
    }
  };

  return (
    <View style={styles.dashboardLayout}>
      {/* Left Panel */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>LIVE COUNT</Text>
        <View style={styles.largeCard}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.largeCardNumber}>{String(counted).padStart(5, '0')}</Text>
          <Text style={styles.largeCardLabel}>Fingerlings Counted</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Target:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
              <TextInput 
                style={[styles.statValue, styles.input, isRunning && styles.inputDisabled]}
                value={targetStr}
                onChangeText={setTargetStr}
                editable={!isRunning}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Price / piece:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
              <Text style={[styles.statValue, {marginRight: 8}]}>₱</Text>
              <TextInput 
                style={[styles.statValue, styles.input, isRunning && styles.inputDisabled]}
                value={priceStr}
                onChangeText={setPriceStr}
                editable={!isRunning}
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Total:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
              <Text style={[styles.statValue, {paddingRight: 8}]}>₱ {total.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        <Pressable 
          style={({pressed}) => [styles.button, styles.btnGreen, { marginTop: 'auto' }, pressed && !isRunning && { opacity: 0.7 }, isRunning && { opacity: 0.9 }]}
          onPress={handleStart}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>{isRunning ? 'Counting... Wait for result' : 'Start Counting'}</Text>
        </Pressable>
      </View>

      {/* Right Panel */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>TRANSACTION HISTORY</Text>
        <ScrollView style={styles.historyList}>
          {history.map((item, index) => (
            <Swipeable key={item.id} renderLeftActions={() => renderLeftActions(item.id)}>
              <View style={styles.historyCardWrapper}>
                <View style={styles.historyBadge}><Text style={styles.historyBadgeText}>{history.length - index}</Text></View>
                <View style={styles.historyCard}>
                  <View style={styles.historyCardColumns}>
                    <View style={styles.historyCol}>
                      <Text style={styles.historyColLabel}>COUNT</Text>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.historyColVal, { color: '#2b7a15' }]}>{item.count}</Text>
                    </View>
                    <View style={styles.historyCol}>
                      <Text style={styles.historyColLabel}>AMOUNT</Text>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.historyColVal, { color: '#ded728' }]}>₱ {(item.amount || 0).toFixed(2)}</Text>
                    </View>
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
  );
};

export default function DashboardScreen() {
  const { role, username, userId } = useLocalSearchParams();
  const isBuyer = role === 'buyer';
  const displayUser = username || 'User';
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const yyyy = now.getFullYear();
      const HH = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${mm}/${dd}/${yyyy} • ${HH}:${min}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatar} />
            <Text style={styles.userName}>{displayUser} - {isBuyer ? 'Buyer' : 'Seller'}</Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.timeText}>{timeStr}</Text>
            <Pressable 
              style={({pressed}) => [styles.logoutBtn, pressed && { opacity: 0.7 }]} 
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Dashboard Content */}
        {isBuyer ? <BuyerDashboard userId={userId as string} /> : <SellerDashboard userId={userId as string} />}

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
    padding: 16,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3DD8CD',
    marginRight: 12,
  },
  userName: {
    fontFamily: 'Roboto_700Bold',
    fontWeight: 'bold',
    fontSize: 24,
    color: '#000000',
  },
  notificationBadge: {
    backgroundColor: '#8654D9',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  notificationText: {
    color: 'white',
    fontWeight: 'bold',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Roboto_700Bold',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 16,
  },
  logoutBtn: {
    backgroundColor: '#B5302A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dashboardLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  panel: {
    flex: 1,
    backgroundColor: '#8C8885',
    borderRadius: 12,
    padding: 16,
  },
  panelTitle: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  largeCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  largeCardNumber: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 56,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 60,
  },
  largeCardLabel: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statValue: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    fontFamily: 'Roboto_700Bold',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    width: 75,
    textAlign: 'right',
  },
  inputDisabled: {
    borderColor: 'transparent',
    backgroundColor: '#9a9794',
    opacity: 0.8,
  },
  divider: {
    height: 2,
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGreen: {
    backgroundColor: '#0EA40E',
  },
  btnRed: {
    backgroundColor: '#A82823',
  },
  buttonText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyList: {
    flex: 1,
  },
  historyCardWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  historyBadge: {
    backgroundColor: '#BA2A23',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomRightRadius: 10,
    alignSelf: 'flex-start',
  },
  historyBadgeText: {
    fontFamily: 'Roboto_700Bold',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyCard: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
    paddingLeft: 12,
  },
  historyCardColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  historyCol: {
    flexShrink: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  historyColLabel: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  historyColVal: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 34,
    fontWeight: 'bold',
  },
  historyDate: {
    fontFamily: 'Roboto_700Bold',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  oldEntriesText: {
    fontFamily: 'Roboto_700Bold',
    textAlign: 'center',
    color: '#666666',
    fontWeight: 'bold',
    fontSize: 22,
    marginTop: 20,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: '#A82823',
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

import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#FFFFFF',
                tabBarInactiveTintColor: '#64748B',
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: '#0A0F1D',
                    borderTopWidth: 0,
                    height: 70,
                    paddingBottom: 12,
                    paddingTop: 12,
                    bottom: 20,
                    left: 20,
                    right: 20,
                    borderRadius: 35,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 0,
                },
                tabBarItemStyle: {
                    height: 70,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: focused ? '#CC0000' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Feather name="home" size={22} color={focused ? '#FFFFFF' : '#64748B'} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="checkin"
                options={{
                    title: 'Check-in',
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: focused ? '#CC0000' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Feather name="calendar" size={22} color={focused ? '#FFFFFF' : '#64748B'} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="feed"
                options={{
                    title: 'Feed',
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: focused ? '#CC0000' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <FontAwesome5 name="users" size={20} color={focused ? '#FFFFFF' : '#64748B'} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="historico"
                options={{
                    title: 'Histórico',
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: focused ? '#CC0000' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <FontAwesome5 name="fire" size={20} color={focused ? '#FFFFFF' : '#64748B'} solid />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ focused }) => (
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: focused ? '#CC0000' : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Feather name="settings" size={22} color={focused ? '#FFFFFF' : '#64748B'} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

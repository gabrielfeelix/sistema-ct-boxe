import { Redirect, Tabs } from 'expo-router'
import type { ReactNode } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'
import { FontAwesome5, Feather } from '@expo/vector-icons'

import { useAuth } from '@/contexts/AuthContext'

export default function TabLayout() {
    const { loading, session } = useAuth()

    const renderTabIcon = (icon: ReactNode, focused: boolean) => (
        <View
            style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: focused ? '#CC0000' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {icon}
        </View>
    )

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FDFDFD',
                }}
            >
                <ActivityIndicator color="#CC0000" size="large" />
            </View>
        )
    }

    if (!session) {
        return <Redirect href="/auth/login" />
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#FFFFFF',
                tabBarInactiveTintColor: '#64748B',
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#0A0F1D',
                    borderTopWidth: 0,
                    height: 82,
                    paddingBottom: 12,
                    paddingTop: 10,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    overflow: 'hidden',
                    ...(Platform.OS === 'web'
                        ? { boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.18)' }
                        : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: -2 },
                              shadowOpacity: 0.18,
                              shadowRadius: 10,
                              elevation: 10,
                          }),
                },
                tabBarItemStyle: {
                    height: 68,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) =>
                        renderTabIcon(
                            <Feather name="home" size={21} color={focused ? '#FFFFFF' : '#64748B'} />,
                            focused
                        ),
                }}
            />
            <Tabs.Screen
                name="checkin"
                options={{
                    title: 'Check-in',
                    tabBarIcon: ({ focused }) =>
                        renderTabIcon(
                            <Feather name="calendar" size={21} color={focused ? '#FFFFFF' : '#64748B'} />,
                            focused
                        ),
                }}
            />
            <Tabs.Screen
                name="feed"
                options={{
                    title: 'Feed',
                    tabBarIcon: ({ focused }) =>
                        renderTabIcon(
                            <FontAwesome5 name="users" size={19} color={focused ? '#FFFFFF' : '#64748B'} />,
                            focused
                        ),
                }}
            />
            <Tabs.Screen
                name="historico"
                options={{
                    title: 'Historico',
                    tabBarIcon: ({ focused }) =>
                        renderTabIcon(
                            <FontAwesome5
                                name="fire"
                                size={19}
                                color={focused ? '#FFFFFF' : '#64748B'}
                                solid
                            />,
                            focused
                        ),
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ focused }) =>
                        renderTabIcon(
                            <Feather name="settings" size={21} color={focused ? '#FFFFFF' : '#64748B'} />,
                            focused
                        ),
                }}
            />
        </Tabs>
    )
}

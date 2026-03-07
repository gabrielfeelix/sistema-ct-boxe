import { useEffect, useRef } from 'react'
import { Animated, Platform, View } from 'react-native'

type SkeletonWidth = number | `${number}%` | 'auto'

export function SkeletonBox({ width, height, className = '' }: { width: SkeletonWidth; height: number; className?: string }) {
    const opacity = useRef(new Animated.Value(0.3)).current
    const shouldUseNativeDriver = Platform.OS !== 'web'

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: shouldUseNativeDriver,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: shouldUseNativeDriver,
                }),
            ])
        )
        animation.start()
        return () => animation.stop()
    }, [opacity, shouldUseNativeDriver])

    return (
        <Animated.View
            style={{
                width,
                height,
                opacity,
            }}
            className={`bg-slate-200 rounded-lg ${className}`}
        />
    )
}

export function FeedPostSkeleton() {
    return (
        <View className="mb-6 border-y border-slate-100 bg-white px-6 py-5">
            <View className="mb-4 flex-row items-center">
                <SkeletonBox width={48} height={48} className="mr-3 rounded-full" />
                <View className="flex-1">
                    <SkeletonBox width="40%" height={16} className="mb-2" />
                    <SkeletonBox width="25%" height={12} />
                </View>
            </View>
            <SkeletonBox width="100%" height={14} className="mb-2" />
            <SkeletonBox width="90%" height={14} className="mb-2" />
            <SkeletonBox width="75%" height={14} className="mb-4" />
        </View>
    )
}

export function NotificationSkeleton() {
    return (
        <View className="mb-3 rounded-3xl border border-slate-100 bg-white px-5 py-5">
            <View className="flex-row items-start">
                <SkeletonBox width={56} height={56} className="mr-4 rounded-2xl" />
                <View className="flex-1">
                    <SkeletonBox width="30%" height={10} className="mb-2" />
                    <SkeletonBox width="80%" height={16} className="mb-1" />
                    <SkeletonBox width="100%" height={14} />
                </View>
            </View>
        </View>
    )
}

export function AulaSkeleton() {
    return (
        <View className="mb-4 rounded-3xl border border-slate-100 bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
                <SkeletonBox width={80} height={24} />
                <SkeletonBox width={60} height={20} className="rounded-md" />
            </View>
            <SkeletonBox width="70%" height={18} className="mb-2" />
            <SkeletonBox width="50%" height={14} className="mb-6" />
            <SkeletonBox width="100%" height={40} className="rounded-xl" />
        </View>
    )
}

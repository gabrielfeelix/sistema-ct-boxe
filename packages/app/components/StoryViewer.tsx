import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface Story {
    id: string;
    nome: string;
    thumbnail: string | null;
    assistido: boolean;
    duracao: number; // in seconds
}

interface StoryViewerProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
    onStoryEnd?: (id: string) => void;
}

export default function StoryViewer({ stories, initialIndex, onClose, onStoryEnd }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startAnimation();
    }, [currentIndex]);

    const startAnimation = () => {
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: stories[currentIndex].duracao * 1000,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                handleNext();
            }
        });
    };

    const handleNext = () => {
        if (onStoryEnd) onStoryEnd(stories[currentIndex].id);
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            progressAnim.setValue(0);
            startAnimation();
        }
    };

    const handlePress = (evt: any) => {
        const x = evt.nativeEvent.locationX;
        if (x < width / 3) {
            handlePrev();
        } else {
            handleNext();
        }
    };

    return (
        <View className="absolute z-50 top-0 left-0 right-0 bottom-0 bg-black flex-1 w-full h-full">
            {/* Bars container */}
            <View className="absolute top-12 left-0 right-0 z-50 flex-row px-2">
                {stories.map((story, i) => {
                    const isCompleted = i < currentIndex;
                    const isActive = i === currentIndex;
                    return (
                        <View key={story.id} className="flex-1 h-1 bg-white/30 mx-1 rounded-full overflow-hidden">
                            <Animated.View
                                style={[
                                    {
                                        height: '100%',
                                        width: '100%',
                                        backgroundColor: 'white',
                                        transform: [{
                                            scaleX: isCompleted ? 1 : isActive ? progressAnim : 0
                                        }],
                                        transformOrigin: 'left',
                                    }
                                ]}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Screen touching area */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                className="flex-1 absolute w-full h-full justify-center items-center"
            >
                <View className="w-full h-full bg-slate-900 justify-center items-center relative">
                    <Feather name="image" size={64} color="#334155" />
                    <Text className="text-white text-3xl font-black tracking-tighter mt-4 text-center px-6">
                        [{stories[currentIndex].nome}] Video Story Here
                    </Text>
                    <Text className="text-white/50 font-bold uppercase tracking-widest text-xs mt-2">
                        Simulação de Story de {stories[currentIndex].duracao}s
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Header with profile and close button */}
            <View className="absolute top-16 left-0 right-0 z-50 flex-row justify-between items-center px-4">
                <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 items-center justify-center mr-3">
                        <Text className="text-white font-bold text-xs">{stories[currentIndex].nome.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text className="text-white font-bold tracking-tight text-base shadow-lg shadow-black/50">
                        {stories[currentIndex].nome}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    className="w-10 h-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md"
                >
                    <Feather name="x" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

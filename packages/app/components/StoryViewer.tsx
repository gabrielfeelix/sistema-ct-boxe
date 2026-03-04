import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'react-native';

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
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        startAnimation();
        playVideo();
    }, [currentIndex]);

    const playVideo = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.playAsync();
                setIsPlaying(true);
            } catch (error) {
                console.log('Error playing video:', error);
            }
        }
    };

    const pauseVideo = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.pauseAsync();
                setIsPlaying(false);
            } catch (error) {
                console.log('Error pausing video:', error);
            }
        }
    };

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

    const handleLongPressIn = () => {
        progressAnim.stopAnimation();
        pauseVideo();
    };

    const handleLongPressOut = () => {
        startAnimation();
        playVideo();
    };

    const currentStory = stories[currentIndex];

    // Proteção contra índice inválido
    if (!currentStory) {
        onClose();
        return null;
    }

    return (
        <View className="absolute z-50 top-0 left-0 right-0 bottom-0 bg-black flex-1 w-full h-full">
            {/* Progress bars */}
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

            {/* Video/Image content */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                onLongPress={handleLongPressIn}
                onPressOut={handleLongPressOut}
                className="flex-1 absolute w-full h-full justify-center items-center bg-black"
            >
                {currentStory.thumbnail ? (
                    <Image
                        source={{ uri: currentStory.thumbnail, cache: 'force-cache' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-full h-full bg-slate-900 justify-center items-center">
                        <Feather name="image" size={64} color="#334155" />
                        <Text className="text-white text-2xl font-black tracking-tight mt-4 text-center px-6">
                            {currentStory.nome}
                        </Text>
                    </View>
                )}

                {/* Bottom gradient overlay for name */}
                <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Story title at bottom */}
                <View className="absolute bottom-8 left-6 right-6">
                    <Text className="text-white text-2xl font-black tracking-tight shadow-lg shadow-black/50">
                        {currentStory.nome.toUpperCase()}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Header with profile and close button */}
            <View className="absolute top-16 left-0 right-0 z-50 flex-row justify-between items-center px-4">
                <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-[#CC0000] border-2 border-white items-center justify-center mr-3">
                        <Feather name="play" size={16} color="white" />
                    </View>
                    <Text className="text-white font-bold tracking-tight text-base shadow-lg shadow-black/50">
                        CT IronPunch
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    className="w-10 h-10 items-center justify-center rounded-full bg-black/40"
                >
                    <Feather name="x" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

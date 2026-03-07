import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Animated, Image, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Video } from "expo-av";

const { width } = Dimensions.get("window");

interface Story {
  id: string;
  nome: string;
  thumbnail: string | null;
  assistido: boolean;
  duracao: number;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryEnd?: (id: string) => void;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}

export default function StoryViewer({
  stories,
  initialIndex,
  onClose,
  onStoryEnd,
}: StoryViewerProps) {
  const safeStories = useMemo(() => stories.filter(Boolean), [stories]);
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialIndex, safeStories.length),
  );
  const progressAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);
  const shouldUseNativeDriver = Platform.OS !== "web";

  useEffect(() => {
    setCurrentIndex((prev) => clampIndex(prev, safeStories.length));
  }, [safeStories.length]);

  useEffect(() => {
    setCurrentIndex(clampIndex(initialIndex, safeStories.length));
  }, [initialIndex, safeStories.length]);

  useEffect(() => {
    if (safeStories.length > 0) return;
    const timer = setTimeout(() => onClose(), 0);
    return () => clearTimeout(timer);
  }, [safeStories.length, onClose]);

  const currentStory = safeStories[currentIndex];
  const currentDurationMs = Math.max(1000, Number(currentStory?.duracao ?? 15) * 1000);

  const playVideo = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.playAsync();
    } catch (error) {
      console.log("Error playing video:", error);
    }
  };

  const pauseVideo = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.pauseAsync();
    } catch (error) {
      console.log("Error pausing video:", error);
    }
  };

  const handleNext = () => {
    if (currentStory && onStoryEnd) onStoryEnd(currentStory.id);
    if (currentIndex < safeStories.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, safeStories.length - 1));
      return;
    }
    onClose();
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    progressAnim.setValue(0);
  };

  useEffect(() => {
    if (!currentStory) return;
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: currentDurationMs,
      useNativeDriver: shouldUseNativeDriver,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
    playVideo();
    return () => {
      progressAnim.stopAnimation();
    };
  }, [currentIndex, currentStory?.id, currentDurationMs]);

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      handlePrev();
      return;
    }
    handleNext();
  };

  const handleLongPressIn = () => {
    progressAnim.stopAnimation();
    pauseVideo();
  };

  const handleLongPressOut = () => {
    if (!currentStory) return;
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: currentDurationMs,
      useNativeDriver: shouldUseNativeDriver,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
    playVideo();
  };

  if (!currentStory) return null;

  return (
    <View className="absolute left-0 right-0 top-0 bottom-0 z-50 flex-1 bg-black">
      <View className="absolute left-0 right-0 top-12 z-50 flex-row px-2">
        {React.Children.toArray(
          safeStories.map((story, i) => {
            const isCompleted = i < currentIndex;
            const isActive = i === currentIndex;
            return (
              <View className="mx-1 h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <Animated.View
                  style={[
                    {
                      height: "100%",
                      width: "100%",
                      backgroundColor: "white",
                      transform: [{ scaleX: isCompleted ? 1 : isActive ? progressAnim : 0 }],
                    },
                  ]}
                />
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onLongPress={handleLongPressIn}
        onPressOut={handleLongPressOut}
        className="absolute h-full w-full flex-1 items-center justify-center bg-black"
      >
        {currentStory.thumbnail ? (
          <Image
            source={{ uri: currentStory.thumbnail, cache: "force-cache" }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-slate-900">
            <Feather name="image" size={64} color="#334155" />
            <Text className="mt-4 px-6 text-center text-2xl font-black tracking-tight text-white">
              {currentStory.nome}
            </Text>
          </View>
        )}

        <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <View className="absolute bottom-8 left-6 right-6">
          <Text className="text-2xl font-black tracking-tight text-white shadow-lg shadow-black/50">
            {currentStory.nome.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      <View className="absolute left-0 right-0 top-16 z-50 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#CC0000]">
            <Feather name="play" size={16} color="white" />
          </View>
          <Text className="text-base font-bold tracking-tight text-white shadow-lg shadow-black/50">
            CT IronPunch
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

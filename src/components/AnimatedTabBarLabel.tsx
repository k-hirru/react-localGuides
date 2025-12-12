import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type AnimatedTabLabelProps = {
  label: string;
  color: string;
  focused: boolean;
};

const AnimatedTabLabel: React.FC<AnimatedTabLabelProps> = ({ label, color, focused }) => {
  const scale = useSharedValue(focused ? 1.05 : 1);

  useEffect(() => {
    scale.value = withTiming(focused ? 1.1 : 1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: -2 }],
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.Text
        style={[
          {
            color,
            fontSize: 12,
            fontWeight: focused ? '700' : '500',
          },
          animatedStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

export default AnimatedTabLabel;

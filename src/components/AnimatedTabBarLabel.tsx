import React, { useRef, useEffect } from "react";
import { Animated, Easing, View } from "react-native";

type AnimatedTabLabelProps = {
  label: string;
  color: string;
  focused: boolean;
};

const AnimatedTabLabel: React.FC<AnimatedTabLabelProps> = ({
  label,
  color,
  focused,
}) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: focused ? 1.1 : 1,
      duration: 15,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [focused, scaleAnim]);


  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.Text
        style={{
          color: color,
          fontSize: 12,
          fontWeight: focused ? '700' : '500',
          transform: [
            { scale: scaleAnim },
            { translateY: -2 },
          ],
        }}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

export default AnimatedTabLabel;
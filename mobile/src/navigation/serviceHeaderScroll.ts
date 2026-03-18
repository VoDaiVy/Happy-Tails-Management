import { Animated } from "react-native";

export const serviceHeaderScrollY = new Animated.Value(0);

export function resetServiceHeaderScroll() {
  serviceHeaderScrollY.setValue(0);
}

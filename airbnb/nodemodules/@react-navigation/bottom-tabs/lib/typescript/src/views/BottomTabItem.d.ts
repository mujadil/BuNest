import { Route } from '@react-navigation/native';
import React from 'react';
import { GestureResponderEvent, StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { BottomTabBarButtonProps, BottomTabDescriptor, LabelPosition } from '../types';
type Props = {
    /**
     * Whether the tab is focused.
     */
    focused: boolean;
    /**
     * The route object which should be specified by the tab.
     */
    route: Route<string>;
    /**
     * The descriptor object for the route.
     */
    descriptor: BottomTabDescriptor;
    /**
     * The label text of the tab.
     */
    label: string | ((props: {
        focused: boolean;
        color: string;
        position: LabelPosition;
        children: string;
    }) => React.ReactNode);
    /**
     * Icon to display for the tab.
     */
    icon: (props: {
        focused: boolean;
        size: number;
        color: string;
    }) => React.ReactNode;
    /**
     * Text to show in a badge on the tab icon.
     */
    badge?: number | string;
    /**
     * Custom style for the badge.
     */
    badgeStyle?: StyleProp<TextStyle>;
    /**
     * URL to use for the link to the tab.
     */
    to?: string;
    /**
     * The button for the tab. Uses a `TouchableWithoutFeedback` by default.
     */
    button?: (props: BottomTabBarButtonProps) => React.ReactNode;
    /**
     * The accessibility label for the tab.
     */
    accessibilityLabel?: string;
    /**
     * An unique ID for testing for the tab.
     */
    testID?: string;
    /**
     * Function to execute on press in React Native.
     * On the web, this will use onClick.
     */
    onPress: (e: React.MouseEvent<HTMLElement, MouseEvent> | GestureResponderEvent) => void;
    /**
     * Function to execute on long press.
     */
    onLongPress: (e: GestureResponderEvent) => void;
    /**
     * Whether the label should be aligned with the icon horizontally.
     */
    horizontal: boolean;
    /**
     * Color for the icon and label when the item is active.
     */
    activeTintColor?: string;
    /**
     * Color for the icon and label when the item is inactive.
     */
    inactiveTintColor?: string;
    /**
     * Background color for item when its active.
     */
    activeBackgroundColor?: string;
    /**
     * Background color for item when its inactive.
     */
    inactiveBackgroundColor?: string;
    /**
     * Whether to show the label text for the tab.
     */
    showLabel?: boolean;
    /**
     * Whether to allow scaling the font for the label for accessibility purposes.
     */
    allowFontScaling?: boolean;
    /**
     * Style object for the label element.
     */
    labelStyle?: StyleProp<TextStyle>;
    /**
     * Style object for the icon element.
     */
    iconStyle?: StyleProp<ViewStyle>;
    /**
     * Style object for the wrapper element.
     */
    style?: StyleProp<ViewStyle>;
};
export default function BottomTabBarItem({ focused, route, descriptor, label, icon, badge, badgeStyle, to, button, accessibilityLabel, testID, onPress, onLongPress, horizontal, activeTintColor: customActiveTintColor, inactiveTintColor: customInactiveTintColor, activeBackgroundColor, inactiveBackgroundColor, showLabel, allowFontScaling, labelStyle, iconStyle, style, }: Props): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
export {};
//# sourceMappingURL=BottomTabItem.d.ts.map
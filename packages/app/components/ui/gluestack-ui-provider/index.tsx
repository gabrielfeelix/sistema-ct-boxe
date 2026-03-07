import React from 'react'
import { View, ViewProps } from 'react-native'

export type ModeType = 'light' | 'dark' | 'system'

export function GluestackUIProvider({
    mode = 'light',
    ...props
}: {
    mode?: ModeType
    children?: React.ReactNode
    style?: ViewProps['style']
}) {
    void mode

    return <View style={[{ flex: 1, height: '100%', width: '100%' }, props.style]}>{props.children}</View>
}

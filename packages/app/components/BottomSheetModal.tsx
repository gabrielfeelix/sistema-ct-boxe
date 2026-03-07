import { ReactNode } from 'react'
import { Modal, Pressable, View } from 'react-native'

interface BottomSheetModalProps {
    visible: boolean
    onClose: () => void
    children: ReactNode
}

export default function BottomSheetModal({ visible, onClose, children }: BottomSheetModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    backgroundColor: 'rgba(15, 23, 42, 0.42)',
                }}
            >
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                <View
                    style={{
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        backgroundColor: '#FFFFFF',
                        paddingBottom: 24,
                        paddingTop: 12,
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        elevation: 20,
                    }}
                >
                    <View
                        style={{
                            alignSelf: 'center',
                            marginBottom: 18,
                            height: 5,
                            width: 52,
                            borderRadius: 999,
                            backgroundColor: '#CBD5E1',
                        }}
                    />
                    {children}
                </View>
            </View>
        </Modal>
    )
}

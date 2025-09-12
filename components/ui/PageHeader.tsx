// components/ui/PageHeader.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/Theme';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  rightComponent,
  backgroundColor = Theme.colors.primary.main,
  textColor = Theme.colors.primary.contrastText,
}) => {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <>
      <StatusBar
        barStyle={backgroundColor === Theme.colors.primary.main ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor }]}>
        <View
          style={[
            styles.container,
            { backgroundColor, paddingTop: Platform.OS === 'android' ? 0 : 0 },
          ]}
        >
          <View style={styles.leftSection}>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={textColor}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.centerSection}>
            <Text
              style={[styles.title, { color: textColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </View>
          <View style={styles.rightSection}>
            {rightComponent}
          </View>

        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Theme.colors.primary.main,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Theme.spacing.md : Theme.spacing.lg,
    minHeight: 56, // Altura mínima padrão do header
    ...Theme.shadows.sm,
  },
  leftSection: {
    minWidth: 40,
    maxWidth: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.sm,
  },
  rightSection: {
    minWidth: 40,
    maxWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backButton: {
    padding: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
    textAlign: 'center',
    maxWidth: '100%',
  },
});

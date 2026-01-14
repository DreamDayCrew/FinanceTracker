import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../lib/api';
import { getThemedColors } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { MoreStackParamList } from '../../App';

type AddCategoryRouteProp = RouteProp<MoreStackParamList, 'AddCategory'>;
type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const ICON_OPTIONS = [
  'cart', 'car', 'restaurant', 'bag-handle', 'game-controller',
  'receipt', 'medical', 'school', 'airplane', 'briefcase',
  'trending-up', 'repeat', 'fast-food', 'home', 'flash',
  'person', 'shield-checkmark', 'card', 'gift', 'fitness',
];

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: 'arrow-down-circle', color: '#ef4444' },
  { value: 'income', label: 'Income', icon: 'arrow-up-circle', color: '#22c55e' },
  { value: 'transfer', label: 'Transfer', icon: 'repeat', color: '#3b82f6' },
];

const COLOR_PALETTE = [
  // Reds
  ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
  // Oranges
  ['#f97316', '#ea580c', '#c2410c', '#9a3412'],
  // Yellows
  ['#eab308', '#ca8a04', '#a16207', '#854d0e'],
  // Greens
  ['#22c55e', '#16a34a', '#15803d', '#166534'],
  // Cyans
  ['#06b6d4', '#0891b2', '#0e7490', '#155e75'],
  // Blues
  ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'],
  // Purples
  ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'],
  // Pinks
  ['#ec4899', '#db2777', '#be185d', '#9f1239'],
];

export default function AddCategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddCategoryRouteProp>();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const queryClient = useQueryClient();

  const categoryId = route.params?.categoryId;
  const isEditing = !!categoryId;

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [selectedIcon, setSelectedIcon] = useState('cart');
  const [selectedType, setSelectedType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: api.getCategories,
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && categories) {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        setName(category.name);
        setSelectedColor(category.color || '#ef4444');
        setSelectedIcon(category.icon || 'cart');
        setSelectedType((category.type as any) || 'expense');
      }
    }
  }, [isEditing, categories, categoryId]);

  const createCategory = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      navigation.goBack();
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; color: string; icon?: string; type?: string } }) => api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      navigation.goBack();
    },
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateCategory.mutateAsync({
          id: categoryId,
          data: { 
            name: name.trim(), 
            color: selectedColor,
            icon: selectedIcon,
            type: selectedType,
          },
        });
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon,
          type: selectedType,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Category' : 'Add Category'}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Preview at the top */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
              <LinearGradient
                colors={[selectedColor + 'CC', selectedColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewIcon}
              >
                <Ionicons name={selectedIcon as any} size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.previewText, { color: colors.text }]}>
                {name || 'Category Name'}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: TYPE_OPTIONS.find(t => t.value === selectedType)?.color + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: TYPE_OPTIONS.find(t => t.value === selectedType)?.color }]}>
                  {TYPE_OPTIONS.find(t => t.value === selectedType)?.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Category Name</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colors.card, 
                  color: colors.text,
                  borderColor: colors.border,
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Groceries, Dining, Transport"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />
          </View>

          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Type</Text>
            <View style={styles.typeContainer}>
              {TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedType === type.value && { 
                      backgroundColor: type.color + '20',
                      borderColor: type.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setSelectedType(type.value as any)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={selectedType === type.value ? type.color : colors.textMuted} 
                  />
                  <Text 
                    style={[
                      styles.typeButtonText, 
                      { color: selectedType === type.value ? type.color : colors.text }
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Icon Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedIcon === icon && { 
                      backgroundColor: selectedColor + '20',
                      borderColor: selectedColor,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Ionicons 
                    name={icon as any} 
                    size={28} 
                    color={selectedIcon === icon ? selectedColor : colors.text} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Color</Text>
            <View style={[styles.colorPaletteCard, { backgroundColor: colors.card }]}>
              {COLOR_PALETTE.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.colorRow}>
                  {row.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorSwatchSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: colors.primary,
                opacity: (!name.trim() || isSubmitting) ? 0.5 : 1,
              }
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Category' : 'Create Category'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPaletteCard: {
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowOpacity: 0.4,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  previewText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
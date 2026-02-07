import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
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
  'cart-outline',
  'car-outline',
  'restaurant-outline',
  'bag-handle-outline',
  'game-controller-outline',
  'receipt-outline',
  'medical-outline',
  'school-outline',
  'airplane-outline',
  'briefcase-outline',
  'trending-up-outline',
  'repeat-outline',
  'fast-food-outline',
  'home-outline',
  'flash-outline',
  'person-outline',
  'shield-checkmark-outline',
  'card-outline',
  'gift-outline',
  'fitness-outline',
  'pizza-outline',
  'cafe-outline',
  'book-outline',
  'heart-outline',
  'phone-portrait-outline',
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
  const [selectedIcon, setSelectedIcon] = useState('cart-outline');
  const [selectedType, setSelectedType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

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
        setSelectedIcon(category.icon || 'cart-outline');
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
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Category' : 'New Category'}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Preview Card */}
          <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
            <View style={styles.previewContent}>
              <LinearGradient
                colors={[selectedColor + 'E6', selectedColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewIconLarge}
              >
                <Ionicons name={selectedIcon as any} size={32} color="#fff" />
              </LinearGradient>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewName, { color: colors.text }]}>
                  {name || 'Category Name'}
                </Text>
                <View style={[styles.typeBadgeSmall, { backgroundColor: TYPE_OPTIONS.find(t => t.value === selectedType)?.color + '15' }]}>
                  <Ionicons 
                    name={TYPE_OPTIONS.find(t => t.value === selectedType)?.icon as any} 
                    size={14} 
                    color={TYPE_OPTIONS.find(t => t.value === selectedType)?.color} 
                  />
                  <Text style={[styles.typeBadgeSmallText, { color: TYPE_OPTIONS.find(t => t.value === selectedType)?.color }]}>
                    {TYPE_OPTIONS.find(t => t.value === selectedType)?.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CATEGORY NAME</Text>
            <TextInput
              style={[
                styles.modernInput,
                { 
                  backgroundColor: colors.card, 
                  color: colors.text,
                  borderColor: colors.border,
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Groceries, Dining Out"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              autoFocus={!isEditing}
            />
          </View>

          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TYPE</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modernTypeButton,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedType === type.value && { 
                      backgroundColor: type.color + '15',
                      borderColor: type.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setSelectedType(type.value as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={28} 
                    color={selectedType === type.value ? type.color : colors.textMuted} 
                  />
                  <Text 
                    style={[
                      styles.modernTypeButtonText, 
                      { color: selectedType === type.value ? type.color : colors.text }
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Appearance Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
            
            {/* Icon Selector */}
            <TouchableOpacity
              style={[styles.selectorButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowIconModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorLeft}>
                <View style={[styles.selectorIconCircle, { backgroundColor: selectedColor + '20' }]}>
                  <Ionicons name={selectedIcon as any} size={24} color={selectedColor} />
                </View>
                <Text style={[styles.selectorLabel, { color: colors.text }]}>Icon</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Color Selector */}
            <TouchableOpacity
              style={[styles.selectorButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowColorModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorLeft}>
                <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
                <Text style={[styles.selectorLabel, { color: colors.text }]}>Color</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
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
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Category' : 'Create Category'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Icon Selection Modal */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIconModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Icon</Text>
              <TouchableOpacity onPress={() => setShowIconModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={true}>
              <View style={styles.iconModalGrid}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.modalIconOption,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      selectedIcon === icon && { 
                        backgroundColor: selectedColor + '20',
                        borderColor: selectedColor,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      setSelectedIcon(icon);
                      setShowIconModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={32} 
                      color={selectedIcon === icon ? selectedColor : colors.text} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Color Selection Modal */}
      <Modal
        visible={showColorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowColorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Color</Text>
              <TouchableOpacity onPress={() => setShowColorModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={true}>
              <View style={styles.colorModalContent}>
                {COLOR_PALETTE.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.colorModalRow}>
                    {row.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.modalColorSwatch,
                          { backgroundColor: color },
                          selectedColor === color && styles.modalColorSwatchSelected,
                        ]}
                        onPress={() => {
                          setSelectedColor(color);
                          setShowColorModal(false);
                        }}
                        activeOpacity={0.8}
                      >
                        {selectedColor === color && (
                          <Ionicons name="checkmark" size={24} color="#fff" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  previewCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  previewInfo: {
    flex: 1,
    gap: 8,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  typeBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typeBadgeSmallText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modernInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    fontWeight: '500',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modernTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    minHeight: 100,
  },
  modernTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  selectorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 0,
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  iconModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  modalIconOption: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorModalContent: {
    padding: 20,
    gap: 16,
  },
  colorModalRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modalColorSwatch: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalColorSwatchSelected: {
    borderWidth: 4,
    borderColor: '#fff',
    shadowOpacity: 0.4,
    transform: [{ scale: 1.05 }],
  },
});
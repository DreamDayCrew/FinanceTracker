import { useState, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getThemedColors } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { Account } from '../lib/types';
import { getAccessToken, API_BASE_URL } from '../lib/api';

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  referenceNumber?: string;
  selected: boolean;
}

interface ParseResult {
  transactions: ExtractedTransaction[];
  accountNumber?: string;
  bankName?: string;
  statementPeriod?: string;
  totalTransactions: number;
}

export default function ImportStatementScreen() {
  const navigation = useNavigation();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string } | null>(null);

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const bankAccounts = accounts.filter(a => a.type === 'bank');

  const parsePdfFile = async (fileUri: string, fileName: string, pdfPassword?: string) => {
    setIsParsing(true);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: 'application/pdf',
      } as any);
      
      if (pdfPassword) {
        formData.append('password', pdfPassword);
      }

      // Add timeout for the request (90 seconds for AI processing)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(`${API_BASE_URL}/api/import/parse-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresPassword) {
          setPendingFile({ uri: fileUri, name: fileName });
          setShowPasswordModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to parse PDF');
      }

      const txWithSelection = data.transactions.map((tx: ExtractedTransaction) => ({
        ...tx,
        selected: true,
      }));

      setParseResult(data);
      setTransactions(txWithSelection);
      setStep('preview');
      setPendingFile(null);
      setPassword('');

      if (data.accountNumber && bankAccounts.length > 0) {
        const matchingAccount = bankAccounts.find(a => 
          a.accountNumber?.endsWith(data.accountNumber)
        );
        if (matchingAccount) {
          setSelectedAccountId(matchingAccount.id);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'The request took too long. Please try again with a smaller PDF.');
      } else {
        Alert.alert('Error', error.message || 'Failed to parse PDF');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      await parsePdfFile(file.uri, file.name);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select PDF');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pendingFile || !password.trim()) return;
    
    setShowPasswordModal(false);
    await parsePdfFile(pendingFile.uri, pendingFile.name, password.trim());
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPendingFile(null);
    setPassword('');
  };

  const toggleTransaction = (index: number) => {
    setTransactions(prev => prev.map((tx, i) => 
      i === index ? { ...tx, selected: !tx.selected } : tx
    ));
  };

  const selectAll = () => {
    setTransactions(prev => prev.map(tx => ({ ...tx, selected: true })));
  };

  const deselectAll = () => {
    setTransactions(prev => prev.map(tx => ({ ...tx, selected: false })));
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const selectedTx = transactions.filter(tx => tx.selected);
      
      const response = await fetch(`${API_BASE_URL}/api/import/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: selectedTx,
          accountId: selectedAccountId,
          skipDuplicates: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import transactions');
      }

      return data;
    },
    onSuccess: (data) => {
      setImportResult({ imported: data.imported, skipped: data.skipped });
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      Alert.alert('Import Failed', error.message);
      setStep('preview');
    },
  });

  const handleImport = () => {
    if (!selectedAccountId) {
      Alert.alert('Select Account', 'Please select an account to import transactions to');
      return;
    }

    const selectedCount = transactions.filter(tx => tx.selected).length;
    if (selectedCount === 0) {
      Alert.alert('No Transactions', 'Please select at least one transaction to import');
      return;
    }

    setStep('importing');
    importMutation.mutate();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const selectedCount = transactions.filter(tx => tx.selected).length;

  const renderUploadStep = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.uploadArea, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.uploadIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="document-text" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.uploadTitle, { color: colors.text }]}>
          Upload Bank Statement
        </Text>
        <Text style={[styles.uploadSubtitle, { color: colors.textMuted }]}>
          Select a PDF bank statement to import transactions automatically
        </Text>
        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={pickDocument}
          disabled={isParsing}
          data-testid="button-pick-pdf"
        >
          {isParsing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Select PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>Supported Banks</Text>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          HDFC, ICICI, SBI, Axis, Kotak, and most other Indian banks
        </Text>
        <Text style={[styles.infoTitle, { color: colors.text, marginTop: 12 }]}>How it works</Text>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          1. Upload your bank statement PDF{'\n'}
          2. AI extracts all transactions{'\n'}
          3. Review and select transactions to import{'\n'}
          4. Choose the account and import
        </Text>
      </View>
    </View>
  );

  const renderPreviewStep = () => (
    <View style={styles.previewContainer}>
      {parseResult && (
        <View style={[styles.statementInfo, { backgroundColor: colors.card }]}>
          <View style={styles.statementRow}>
            <Ionicons name="business" size={20} color={colors.primary} />
            <Text style={[styles.statementText, { color: colors.text }]}>
              {parseResult.bankName || 'Bank Statement'}
            </Text>
          </View>
          {parseResult.statementPeriod && (
            <Text style={[styles.statementPeriod, { color: colors.textMuted }]}>
              {parseResult.statementPeriod}
            </Text>
          )}
          <Text style={[styles.transactionCount, { color: colors.textMuted }]}>
            {parseResult.totalTransactions} transactions found
          </Text>
        </View>
      )}

      <View style={[styles.accountSelector, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Import to Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {bankAccounts.map(account => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountChip,
                { 
                  backgroundColor: selectedAccountId === account.id ? colors.primary : colors.background,
                  borderColor: selectedAccountId === account.id ? colors.primary : colors.border
                }
              ]}
              onPress={() => setSelectedAccountId(account.id)}
              data-testid={`button-account-${account.id}`}
            >
              <Ionicons 
                name="wallet" 
                size={16} 
                color={selectedAccountId === account.id ? '#fff' : colors.text} 
              />
              <Text style={[
                styles.accountChipText, 
                { color: selectedAccountId === account.id ? '#fff' : colors.text }
              ]}>
                {account.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.selectionBar, { backgroundColor: colors.card }]}>
        <Text style={[styles.selectionText, { color: colors.text }]}>
          {selectedCount} of {transactions.length} selected
        </Text>
        <View style={styles.selectionButtons}>
          <TouchableOpacity onPress={selectAll} style={styles.selectionBtn}>
            <Text style={[styles.selectionBtnText, { color: colors.primary }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deselectAll} style={styles.selectionBtn}>
            <Text style={[styles.selectionBtnText, { color: colors.textMuted }]}>None</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.transactionItem,
              { 
                backgroundColor: colors.card,
                opacity: item.selected ? 1 : 0.5
              }
            ]}
            onPress={() => toggleTransaction(index)}
            data-testid={`button-transaction-${index}`}
          >
            <View style={[
              styles.checkbox,
              { 
                backgroundColor: item.selected ? colors.primary : 'transparent',
                borderColor: item.selected ? colors.primary : colors.border
              }
            ]}>
              {item.selected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={styles.transactionDetails}>
              <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                {formatDate(item.date)}
              </Text>
              <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: item.type === 'credit' ? colors.success : colors.text }
            ]}>
              {item.type === 'credit' ? '+' : '-'}₹{item.amount.toFixed(0)}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.transactionList}
      />

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => {
            setStep('upload');
            setTransactions([]);
            setParseResult(null);
          }}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: colors.primary }]}
          onPress={handleImport}
          disabled={selectedCount === 0 || !selectedAccountId}
          data-testid="button-import"
        >
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.importButtonText}>Import {selectedCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImportingStep = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text }]}>
        Importing transactions...
      </Text>
      <Text style={[styles.loadingSubtext, { color: colors.textMuted }]}>
        This may take a moment
      </Text>
    </View>
  );

  const renderDoneStep = () => (
    <View style={styles.centerContainer}>
      <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text }]}>Import Complete!</Text>
      <Text style={[styles.successText, { color: colors.textMuted }]}>
        {importResult?.imported} transactions imported
        {importResult?.skipped ? `\n${importResult.skipped} duplicates skipped` : ''}
      </Text>
      <TouchableOpacity
        style={[styles.doneButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.goBack()}
        data-testid="button-done"
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.importMoreButton, { borderColor: colors.border }]}
        onPress={() => {
          setStep('upload');
          setTransactions([]);
          setParseResult(null);
          setImportResult(null);
        }}
        data-testid="button-import-more"
      >
        <Text style={[styles.importMoreText, { color: colors.primary }]}>Import Another Statement</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Import Statement</Text>
        <View style={{ width: 24 }} />
      </View>

      {step === 'upload' && renderUploadStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
      {step === 'done' && renderDoneStep()}

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={handlePasswordCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed" size={32} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Password Protected PDF
              </Text>
            </View>
            
            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              This bank statement is password-protected. Please enter the password to continue.
            </Text>
            
            <Text style={[styles.passwordHint, { color: colors.textMuted }]}>
              Common passwords: DOB (DDMMYYYY), PAN number, or last 4 digits of account
            </Text>
            
            <TextInput
              style={[styles.passwordInput, { 
                backgroundColor: colors.background, 
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Enter PDF password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
              data-testid="input-pdf-password"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={handlePasswordCancel}
                data-testid="button-cancel-password"
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handlePasswordSubmit}
                disabled={!password.trim()}
                data-testid="button-submit-password"
              >
                <Text style={styles.submitButtonText}>Unlock</Text>
              </TouchableOpacity>
            </View>
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
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  uploadArea: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  previewContainer: {
    flex: 1,
  },
  statementInfo: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  statementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statementText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statementPeriod: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 28,
  },
  transactionCount: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 28,
  },
  accountSelector: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  selectionText: {
    fontSize: 13,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionBtn: {
    padding: 4,
  },
  selectionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  transactionList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 11,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  doneButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 32,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
  },
  importMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  passwordHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButton: {},
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

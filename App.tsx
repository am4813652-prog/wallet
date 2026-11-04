import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { HDNodeWallet, Mnemonic, Wallet as EthersWallet } from 'ethers';
import QRCode from 'react-native-qrcode-svg';
import CryptoJS from 'crypto-js';

type WalletMeta = { id: string; name: string; address: string; createdAt: number; icon?: string };
type Secret = { privateKey: string; phrase?: string; passphrase?: string };
type Screen = 'welcome' | 'pin' | 'confirmPin' | 'security' | 'walletName' | 'import' | 'phrase' | 'backup' | 'home' | 'verify' | 'export' | 'scan' | 'settings';
type Tab = 'Assets' | 'Send' | 'Receive';
type Intent = 'export' | 'delete' | 'phrase' | null;

const C = { bg: '#090D13', panel: '#111923', panel2: '#172330', text: '#F4F7FB', muted: '#8B9AAA', line: '#263342', green: '#5CE1B6', red: '#FF7676', amber: '#F2C879' };
const KEYS = { wallets: 'wallet.list.v1', pin: 'wallet.pin.digest.v1', salt: 'wallet.pin.salt.v1', bio: 'wallet.fingerprint.enabled.v1', active: 'wallet.active.id.v1' };
const networks = [
  { name: 'Ethereum Mainnet', native: 'ETH', rpc: 'https://ethereum-rpc.publicnode.com' },
  { name: 'Arbitrum One', native: 'ETH', rpc: 'https://arbitrum-one-rpc.publicnode.com' },
  { name: 'Avalanche C-Chain', native: 'AVAX', rpc: 'https://avalanche-c-chain-rpc.publicnode.com' },
  { name: 'Base', native: 'ETH', rpc: 'https://base-rpc.publicnode.com' },
  { name: 'BNB Smart Chain', native: 'BNB', rpc: 'https://bsc-rpc.publicnode.com' },
  { name: 'Blast', native: 'ETH', rpc: 'https://blast-rpc.publicnode.com' },
  { name: 'Celo', native: 'CELO', rpc: 'https://celo-rpc.publicnode.com' },
  { name: 'Linea', native: 'ETH', rpc: 'https://linea-rpc.publicnode.com' },
  { name: 'opBNB', native: 'BNB', rpc: 'https://opbnb-rpc.publicnode.com' },
  { name: 'Optimism', native: 'ETH', rpc: 'https://optimism-rpc.publicnode.com' },
  { name: 'Palm', native: 'PALM', rpc: 'https://palm-mainnet.public.blastapi.io' },
  { name: 'Polygon PoS', native: 'POL', rpc: 'https://polygon-bor-rpc.publicnode.com' },
  { name: 'Scroll', native: 'ETH', rpc: 'https://scroll-rpc.publicnode.com' },
  { name: 'Sei', native: 'SEI', rpc: 'https://sei-evm-rpc.publicnode.com' },
] as const;
const SECRET_PREFIX = 'wallet.secret.';

function digestPin(salt: string, pin: string) {
  return CryptoJS.PBKDF2(`${salt}:${pin}`, salt, { keySize: 256 / 32, iterations: 120000, hasher: CryptoJS.algo.SHA256 }).toString();
}
function Button({ title, onPress, secondary = false, danger = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondaryButton, danger && s.dangerButton, disabled && s.disabled, pressed && !disabled && s.pressed]}><Text style={[s.buttonText, secondary && s.secondaryText, danger && s.dangerText]}>{title}</Text></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, multiline = false, keyboardType = 'default' }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; secureTextEntry?: boolean; multiline?: boolean; keyboardType?: 'default' | 'number-pad' }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#687687" secureTextEntry={secureTextEntry} multiline={multiline} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} selectionColor={C.green} style={[s.input, multiline && s.multiline]} /></View>;
}
function Top({ title, back }: { title: string; back: () => void }) { return <View style={s.top}><Pressable onPress={back} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text style={s.topTitle}>{title}</Text><View style={s.back} /></View>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text></Pressable>; }

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [tab, setTab] = useState<Tab>('Assets');
  const [wallets, setWallets] = useState<WalletMeta[]>([]);
  const [active, setActive] = useState<WalletMeta | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinEntry, setPinEntry] = useState('');
  const [salt, setSalt] = useState('');
  const [name, setName] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('ETH');
  const [selectedIcon, setSelectedIcon] = useState('ETH');
  const [pendingWallet, setPendingWallet] = useState<'new' | 'import'>('new');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [phrase, setPhrase] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [importText, setImportText] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [fingerprintOn, setFingerprintOn] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [networkName, setNetworkName] = useState<string>(networks[0].name);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceState, setBalanceState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [recipient, setRecipient] = useState('');
  const [scanImport, setScanImport] = useState(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [intent, setIntent] = useState<Intent>(null);
  const [verifiedKey, setVerifiedKey] = useState('');
  const [phraseRecall, setPhraseRecall] = useState(false);

  const network = networks.find((item) => item.name === networkName) ?? networks[0];

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const raw = await AsyncStorage.getItem(KEYS.wallets);
      let list: WalletMeta[] = [];
      try { list = raw ? JSON.parse(raw) as WalletMeta[] : []; } catch { list = []; }
      const activeId = await SecureStore.getItemAsync(KEYS.active);
      const savedSalt = await SecureStore.getItemAsync(KEYS.salt);
      const bio = await SecureStore.getItemAsync(KEYS.bio);
      const types: number[] = await LocalAuthentication.supportedAuthenticationTypesAsync().catch((): number[] => []);
      const hardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      if (!mounted) return;
      setWallets(list); setSalt(savedSalt ?? ''); setFingerprintOn(bio === 'true');
      setFingerprintAvailable(hardware && enrolled && types.includes(1));
      if (await SecureStore.getItemAsync(KEYS.pin) && list.length) {
        const selected = list.find((item) => item.id === activeId) ?? list[0];
        setActive(selected); setScreen('pin');
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (screen === 'phrase' || screen === 'export') {
      void ScreenCapture.preventScreenCaptureAsync('wallet-secrets').catch(() => {});
      return () => { void ScreenCapture.allowScreenCaptureAsync('wallet-secrets').catch(() => {}); };
    }
    return;
  }, [screen]);

  const fetchNativeBalance = React.useCallback(async () => {
    if (!active) return;
    setBalanceState('loading'); setBalance(null);
    try {
      const response = await fetch(network.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [active.address, 'latest'] }) });
      if (!response.ok) throw new Error('RPC');
      const result = await response.json();
      if (result.error || typeof result.result !== 'string') throw new Error('RPC');
      setBalance((Number(BigInt(result.result)) / 1e18).toFixed(6)); setBalanceState('ready');
    } catch { setBalanceState('error'); }
  }, [active, network.rpc]);

  function startWallet(kind: 'new' | 'import') {
    void (async () => {
      const existingPin = await SecureStore.getItemAsync(KEYS.pin);
      setPendingWallet(kind); setName(''); setImportText('');
      if (!existingPin) { setIntent(null); setScreen('pin'); return; }
      setScreen(kind === 'new' ? 'walletName' : 'import');
    })();
  }
  async function savePin() {
    if (!/^\d{6}$/.test(pin)) return Alert.alert('Invalid PIN', 'Enter exactly 6 digits.');
    setScreen('confirmPin');
  }
  async function confirmPinSetup() {
    if (pin !== confirmPin) { setConfirmPin(''); return Alert.alert('PINs do not match', 'Enter the same six digits.'); }
    const bytes = Crypto.getRandomBytes(16);
    const newSalt = Array.from(bytes).map((v) => v.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(KEYS.salt, newSalt);
    await SecureStore.setItemAsync(KEYS.pin, digestPin(newSalt, pin));
    setSalt(newSalt); setPin(''); setConfirmPin(''); setScreen('security');
  }
  async function createWallet() {
    if (!name.trim()) return Alert.alert('Wallet name required', 'Enter a name first.');
    if (passphrase !== confirmPassphrase) return Alert.alert('Passphrases do not match', 'Enter the same optional BIP-39 passphrase twice.');
    setBusy(true);
    try {
      const words = Mnemonic.fromEntropy(Crypto.getRandomBytes(32));
      const wallet = HDNodeWallet.fromPhrase(words.phrase, passphrase);
      const meta: WalletMeta = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), address: wallet.address, createdAt: Date.now(), icon: selectedIcon };
      const list = [...wallets, meta];
      await SecureStore.setItemAsync(`${SECRET_PREFIX}${meta.id}`, JSON.stringify({ privateKey: wallet.privateKey, phrase: words.phrase, passphrase } satisfies Secret));
      await AsyncStorage.setItem(KEYS.wallets, JSON.stringify(list)); await SecureStore.setItemAsync(KEYS.active, meta.id);
      setWallets(list); setActive(meta); setPhrase(words.phrase); setPassphrase(''); setConfirmPassphrase(''); setScreen('phrase');
    } catch { Alert.alert('Wallet creation failed', 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function importWallet() {
    if (!name.trim() || !importText.trim()) return Alert.alert('Missing information', 'Enter a wallet name and recovery phrase or private key.');
    setBusy(true);
    try {
      const candidate = importText.trim().replace(/\s+/g, ' ');
      let wallet: HDNodeWallet | EthersWallet;
      let secret: Secret;
      if (candidate.split(' ').length === 24) {
        const m = Mnemonic.fromPhrase(candidate);
        wallet = HDNodeWallet.fromPhrase(m.phrase, importPassphrase);
        secret = { privateKey: wallet.privateKey, phrase: m.phrase, passphrase: importPassphrase };
      } else {
        wallet = new EthersWallet(candidate.startsWith('0x') ? candidate : `0x${candidate}`);
        secret = { privateKey: wallet.privateKey };
      }
      const meta: WalletMeta = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), address: wallet.address, createdAt: Date.now(), icon: selectedIcon };
      const list = [...wallets, meta];
      await SecureStore.setItemAsync(`${SECRET_PREFIX}${meta.id}`, JSON.stringify(secret));
      await AsyncStorage.setItem(KEYS.wallets, JSON.stringify(list)); await SecureStore.setItemAsync(KEYS.active, meta.id);
      setWallets(list); setActive(meta); setImportText(''); setImportPassphrase(''); Keyboard.dismiss();
      if (secret.phrase) { setPhrase(secret.phrase); setScreen('phrase'); } else { setScreen('home'); }
    } catch { Alert.alert('Import failed', 'The recovery phrase or private key is invalid.'); }
    finally { setBusy(false); }
  }
  async function unlock() {
    if (pinEntry.length !== 6) return Alert.alert('Enter PIN', 'Your PIN must contain six digits.');
    const saved = await SecureStore.getItemAsync(KEYS.pin);
    if (digestPin(salt, pinEntry) !== saved) { setPinEntry(''); return Alert.alert('Incorrect PIN', 'Try again.'); }
    setPinEntry(''); setScreen('home');
  }
  async function unlockFingerprint() {
    if (!fingerprintOn || !fingerprintAvailable) return;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Wallet with fingerprint', biometricsSecurityLevel: 'strong', disableDeviceFallback: true });
    if (result.success) setScreen('home');
    else Alert.alert('Fingerprint not verified', 'Use your 6-digit PIN instead.');
  }
  async function enableFingerprint() {
    if (!fingerprintAvailable) return Alert.alert('Fingerprint unavailable', 'No enrolled fingerprint sensor was detected.');
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable fingerprint unlock', biometricsSecurityLevel: 'strong', disableDeviceFallback: true });
    if (!result.success) return;
    await SecureStore.setItemAsync(KEYS.bio, 'true'); setFingerprintOn(true);
    Alert.alert('Fingerprint enabled', 'Wallet will request your PIN and fingerprint when unlocking.');
  }
  async function continueSecurity(withFingerprint: boolean) {
    if (withFingerprint) await enableFingerprint();
    setScreen(pendingWallet === 'new' ? 'walletName' : 'import');
  }
  async function beginSensitiveAction(which: Exclude<Intent, null>) {
    setIntent(which); setPinEntry(''); setScreen('verify');
  }
  async function verifySensitiveAction() {
    if (!active || !intent) return;
    const saved = await SecureStore.getItemAsync(KEYS.pin);
    if (pinEntry.length !== 6 || digestPin(salt, pinEntry) !== saved) { setPinEntry(''); return Alert.alert('Verification failed', 'The PIN was not correct.'); }
    setPinEntry('');
    if (!fingerprintAvailable) return Alert.alert('Fingerprint required', 'This action requires an enrolled fingerprint sensor on this device.');
    const auth = await LocalAuthentication.authenticateAsync({ promptMessage: intent === 'export' ? 'Authorize private-key export with fingerprint' : intent === 'phrase' ? 'Authorize recovery phrase with fingerprint' : 'Authorize wallet deletion with fingerprint', biometricsSecurityLevel: 'strong', disableDeviceFallback: true });
    if (!auth.success) return Alert.alert('Cancelled', 'Fingerprint verification did not complete.');
    if (intent === 'export') {
      const raw = await SecureStore.getItemAsync(`${SECRET_PREFIX}${active.id}`);
      if (!raw) return Alert.alert('Key unavailable', 'Wallet secret could not be read.');
      const secret = JSON.parse(raw) as Secret; setVerifiedKey(secret.privateKey); setScreen('export');
    } else if (intent === 'phrase') {
      const raw = await SecureStore.getItemAsync(`${SECRET_PREFIX}${active.id}`);
      if (!raw) return Alert.alert('Phrase unavailable', 'Wallet secret could not be read.');
      const secret = JSON.parse(raw) as Secret;
      if (!secret.phrase) return Alert.alert('No recovery phrase', 'This wallet was imported from a private key and has no recovery phrase stored.');
      setPhrase(secret.phrase); setPhraseRecall(true); setScreen('phrase');
    } else {
      Alert.alert('Delete wallet?',  'This permanently removes this wallet from this device. Continue only if you have a verified recovery backup.', [
        { text: 'Cancel', style: 'cancel', onPress: () => { setIntent(null); setScreen('settings'); } },
        { text: 'Delete', style: 'destructive', onPress: () => { void deleteWallet(); } },
      ]);
    }
  }
  async function deleteWallet() {
    if (!active) return;
    const remaining = wallets.filter((item) => item.id !== active.id);
    await SecureStore.deleteItemAsync(`${SECRET_PREFIX}${active.id}`); await AsyncStorage.setItem(KEYS.wallets, JSON.stringify(remaining));
    setWallets(remaining); setActive(remaining[0] ?? null); setIntent(null);
    if (remaining[0]) await SecureStore.setItemAsync(KEYS.active, remaining[0].id); else await SecureStore.deleteItemAsync(KEYS.active);
    setScreen(remaining.length ? 'home' : 'welcome');
  }
  async function pickWallet(item: WalletMeta) { await SecureStore.setItemAsync(KEYS.active, item.id); setActive(item); setScreen('home'); setTab('Assets'); }
  function openSettings() { if (active) { setEditName(active.name); setEditIcon(active.icon ?? 'ETH'); } setScreen('settings'); }
  async function saveWalletProfile() {
    if (!active || !editName.trim()) return Alert.alert('Name required', 'Enter a wallet name.');
    const updated = { ...active, name: editName.trim(), icon: editIcon };
    const next = wallets.map((item) => item.id === active.id ? updated : item);
    await AsyncStorage.setItem(KEYS.wallets, JSON.stringify(next)); setWallets(next); setActive(updated);
    Alert.alert('Saved', 'Wallet profile updated.');
  }
  async function openScanner(forImport: boolean) {
    setScanImport(forImport);
    if (!cameraPermission?.granted) { const p = await requestCameraPermission(); if (!p.granted) return Alert.alert('Camera permission required', 'Allow camera access to scan a QR code.'); }
    setScreen('scan');
  }
  function handleQr(data: string) {
    if (scanImport) { setImportText(data); setScreen('import'); } else { setRecipient(data); setScreen('home'); setTab('Send'); }
  }

  function renderWelcome() { return <View style={s.center}><View style={s.logo}><Text style={s.logoText}>W</Text></View><Text style={s.brand}>Wallet</Text><Text style={s.subtitle}>Your keys stay on your device.</Text><Button title="Create New Wallet" onPress={() => startWallet('new')} /><Button title="Import Existing Wallet" secondary onPress={() => startWallet('import')} /><Text style={s.footnote}>Self-custody wallet · Never share your recovery phrase</Text></View>; }
  function renderPinSetup() { const confirm = screen === 'confirmPin'; return <View style={s.page}><Top title={confirm ? 'Confirm PIN' : 'Secure Wallet'} back={() => setScreen('welcome')} /><Text style={s.heading}>{confirm ? 'Enter the same 6 digits' : 'Create a 6-digit PIN'}</Text><Text style={s.body}>The PIN protects access to this app on this device. It is not a recovery method.</Text><Field label="6-digit PIN" value={confirm ? confirmPin : pin} onChangeText={(v) => (confirm ? setConfirmPin(v.replace(/\D/g, '').slice(0, 6)) : setPin(v.replace(/\D/g, '').slice(0, 6)))} placeholder="••••••" secureTextEntry keyboardType="number-pad" /><Button title={confirm ? 'Confirm PIN' : 'Continue'} onPress={confirm ? () => void confirmPinSetup() : () => void savePin()} disabled={(confirm ? confirmPin : pin).length !== 6} /></View>; }
  function renderSecurity() { return <View style={s.page}><Top title="Fingerprint security" back={() => setScreen(pendingWallet === 'new' ? 'walletName' : 'import')} /><Text style={s.heading}>Use fingerprint?</Text><Text style={s.body}>Fingerprint unlock is optional. If enabled, Wallet will request your PIN and the device biometric prompt when unlocking.</Text>{fingerprintAvailable ? <Button title="Enable fingerprint" onPress={() => void continueSecurity(true)} /> : <View style={s.warning}><Text style={s.warningTitle}>No enrolled fingerprint detected</Text><Text style={s.body}>You can continue with your PIN and enable fingerprint later in Settings.</Text></View>}<Button title="Continue with PIN only" secondary onPress={() => void continueSecurity(false)} /></View>; }
  function renderWalletName() { return <View style={s.page}><Top title="Create wallet" back={() => setScreen('welcome')} /><Text style={s.heading}>Name your wallet</Text><Field label="Wallet name" value={name} onChangeText={setName} placeholder="My wallet" /><Text style={s.label}>Wallet icon</Text><View style={s.chips}>{['ETH', 'BTC', 'BNB', 'SOL', 'AVAX', 'USDC'].map((symbol) => <Chip key={symbol} label={symbol} active={selectedIcon === symbol} onPress={() => setSelectedIcon(symbol)} />)}</View><Field label="Optional BIP-39 passphrase" value={passphrase} onChangeText={setPassphrase} placeholder="Optional" secureTextEntry /><Field label="Confirm passphrase" value={confirmPassphrase} onChangeText={setConfirmPassphrase} placeholder="Repeat passphrase" secureTextEntry /><Text style={s.warningText}>A passphrase changes the derived wallet. If you forget it, it cannot be recovered.</Text><Button title={busy ? 'Generating…' : 'Generate 24-word phrase'} onPress={() => void createWallet()} disabled={busy || !name.trim()} /></View>; }
  function renderImport() { return <ScrollView contentContainerStyle={s.page}><Top title="Import wallet" back={() => setScreen(wallets.length ? 'home' : 'welcome')} /><Text style={s.heading}>Import an existing wallet</Text><Text style={s.body}>Enter a 24-word recovery phrase or private key. Data is processed locally.</Text><Field label="Recovery phrase or private key" value={importText} onChangeText={setImportText} placeholder="Paste here or scan QR" multiline /><Button title="Scan QR code" secondary onPress={() => void openScanner(true)} /><Field label="BIP-39 passphrase (optional)" value={importPassphrase} onChangeText={setImportPassphrase} placeholder="Only if used with the phrase" secureTextEntry /><Field label="Wallet name" value={name} onChangeText={setName} placeholder="Imported wallet" /><Button title={busy ? 'Importing…' : 'Import wallet'} onPress={() => void importWallet()} disabled={busy || !name.trim() || !importText.trim()} /><Text style={s.footnote}>Never enter your phrase or private key into a website, chat, or support form.</Text></ScrollView>; }
  function renderPhrase() { const words = phrase.split(' ').filter(Boolean); return <ScrollView contentContainerStyle={s.page}><Top title="Recovery phrase" back={() => { if (phraseRecall) { setPhrase(''); setPhraseRecall(false); setScreen('settings'); } }} /><View style={s.warning}><Text style={s.warningTitle}>Keep these 24 words secret</Text><Text style={s.body}>Anyone who sees them can control this wallet. Write them down offline. Do not screenshot or share them.</Text></View><View style={s.words}>{words.map((word, i) => <View key={`${i}-${word}`} style={s.word}><Text style={s.wordNumber}>{i + 1}</Text><Text style={s.wordText}>{word}</Text></View>)}</View><Button title={phraseRecall ? 'Hide recovery phrase' : 'I have backed it up'} onPress={() => { if (phraseRecall) { setPhrase(''); setPhraseRecall(false); setIntent(null); setScreen('settings'); } else setScreen('backup'); }} /><Text style={s.footnote}>The phrase is displayed only on this protected screen. Protect the offline copy.</Text></ScrollView>; }
  function renderBackup() { return <View style={s.page}><Top title="Confirm backup" back={() => setScreen('phrase')} /><Text style={s.heading}>Before you continue</Text><Text style={s.body}>Store all 24 words in order, offline and privately. This initial build does not yet include a randomized word confirmation quiz.</Text><View style={s.warning}><Text style={s.warningTitle}>Recovery responsibility</Text><Text style={s.body}>If the phone is lost and you do not have the phrase, Wallet cannot restore your funds.</Text></View><Button title="Continue to wallet" onPress={() => { setPhrase(''); setScreen('home'); setTab('Assets'); }} /></View>; }
  function renderUnlock() { return <View style={s.center}><View style={s.logo}><Text style={s.logoText}>W</Text></View><Text style={s.brand}>Wallet</Text><Text style={s.subtitle}>Unlock {active?.name ?? 'your wallet'}</Text>{fingerprintOn && fingerprintAvailable && <Button title="Unlock with fingerprint" onPress={() => void unlockFingerprint()} />}<Field label="6-digit PIN" value={pinEntry} onChangeText={(v) => setPinEntry(v.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" secureTextEntry keyboardType="number-pad" /><Button title="Unlock with PIN" onPress={() => void unlock()} disabled={pinEntry.length !== 6} /></View>; }
  function renderHome() { if (!active) return <View style={s.page}><Text style={s.heading}>No wallet selected</Text><Button title="Create or import wallet" onPress={() => setScreen('welcome')} /></View>; return <View style={s.home}><View style={s.header}><View><Text style={s.eyebrow}>WALLET</Text><Pressable onPress={openSettings}><Text style={s.walletName}>{active.name}⌄</Text></Pressable></View><Pressable onPress={openSettings} style={s.more}><Text style={s.moreText}>•••</Text></Pressable></View><Text style={[s.eyebrow, { paddingHorizontal: 18 }]}>NETWORK</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.networks}>{networks.map((item) => <Chip key={item.name} label={item.name} active={networkName === item.name} onPress={() => { setNetworkName(item.name); setSelectedAsset(item.native); }} />)}</ScrollView><View style={s.tabs}>{(['Assets', 'Send', 'Receive'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, tab === item && s.tabActive]}><Text style={[s.tabText, tab === item && s.tabTextActive]}>{item}</Text></Pressable>)}</View>{tab === 'Assets' ? renderAssets() : tab === 'Send' ? renderSend() : renderReceive()}</View>; }
  function renderAssets() { return <ScrollView contentContainerStyle={s.content}><View style={s.total}><Text style={s.eyebrow}>TOTAL BALANCE</Text><Text style={s.totalAmount}>—</Text><Text style={s.muted}>USD valuation not connected</Text></View><Text style={s.section}>Assets on {network.name}</Text><View style={s.asset}><View style={s.coin}><Text style={s.coinText}>{network.native[0]}</Text></View><View style={s.assetInfo}><Text style={s.assetName}>{network.native}</Text><Text style={s.muted}>Native network asset</Text></View><View style={s.right}>{balanceState === 'loading' ? <ActivityIndicator color={C.green} /> : <Text style={s.assetName}>{balanceState === 'ready' ? balance : '—'}</Text>}<Text style={s.muted}>{balanceState === 'error' ? 'RPC unavailable' : 'USD —'}</Text></View></View>{['USDT', 'USDC'].map((symbol) => <View key={symbol} style={s.asset}><View style={[s.coin, s.stableCoin]}><Text style={s.coinText}>{symbol[0]}</Text></View><View style={s.assetInfo}><Text style={s.assetName}>{symbol}</Text><Text style={s.muted}>Token balance not configured</Text></View><View style={s.right}><Text style={s.assetName}>—</Text><Text style={s.muted}>USD —</Text></View></View>)}<Button title="Refresh native balance" secondary onPress={() => void fetchNativeBalance()} /><Text style={s.footnote}>Only the native balance is queried in this prototype. Verified token contracts and live price feeds are not connected; no balances or USD values are fabricated.</Text></ScrollView>; }
  function renderSend() { return <ScrollView contentContainerStyle={s.content}><Text style={s.section}>Send</Text><View style={s.card}><Text style={s.label}>Asset</Text><View style={s.chips}><Chip label={network.native} active={selectedAsset === network.native} onPress={() => setSelectedAsset(network.native)}/><Chip label="USDT" active={selectedAsset === 'USDT'} onPress={() => setSelectedAsset('USDT')}/><Chip label="USDC" active={selectedAsset === 'USDC'} onPress={() => setSelectedAsset('USDC')}/></View><Field label="Amount" value={amount} onChangeText={setAmount} placeholder={`${selectedAsset} amount`} /><Field label="Recipient address" value={recipient} onChangeText={setRecipient} placeholder="0x…" /><Button title="Scan recipient QR" secondary onPress={() => void openScanner(false)} /><View style={s.warning}><Text style={s.warningTitle}>Sending is not enabled</Text><Text style={s.body}>This build does not broadcast transactions. Verified token contracts, gas estimation, current fees, and transaction confirmations must be implemented and tested on test networks before real-fund transfers are enabled.</Text></View></View></ScrollView>; }
  function renderReceive() { return <ScrollView contentContainerStyle={s.content}><Text style={s.section}>Receive</Text><View style={s.cardCenter}><Text style={s.eyebrow}>{network.name.toUpperCase()}</Text><View style={s.qr}><QRCode value={active?.address ?? ''} size={220} backgroundColor="#FFFFFF" color="#081019" /></View><Text selectable style={s.address}>{active?.address}</Text><Button title="Copy public address" secondary onPress={() => { if (active) { void Clipboard.setStringAsync(active.address); Alert.alert('Copied', 'Public address copied.'); } }} /><Text style={s.footnote}>Only send assets compatible with this network to this address.</Text></View></ScrollView>; }
  function renderVerify() { const title = intent === 'export' ? 'Authorize key export' : intent === 'phrase' ? 'Authorize recovery phrase' : 'Authorize deletion'; return <View style={s.page}><Top title={title} back={() => { setIntent(null); setScreen('settings'); }} /><Text style={s.heading}>Confirm it is you</Text><Text style={s.body}>Enter your 6-digit PIN. Then the device fingerprint prompt will appear. This action is not available without an enrolled fingerprint.</Text><Field label="6-digit PIN" value={pinEntry} onChangeText={(v) => setPinEntry(v.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" secureTextEntry keyboardType="number-pad" /><Button title="Continue with fingerprint" onPress={() => void verifySensitiveAction()} disabled={pinEntry.length !== 6} /></View>; }
  function renderExport() { return <ScrollView contentContainerStyle={s.page}><Top title="Export private key" back={() => { setVerifiedKey(''); setScreen('settings'); }} /><View style={s.warning}><Text style={s.warningTitle}>Anyone who scans this QR can control your wallet</Text><Text style={s.body}>Use only in a private place. Do not screenshot, send, or scan with an untrusted device. The QR contains your full private key.</Text></View><View style={s.qr}><QRCode value={verifiedKey} size={240} backgroundColor="#FFFFFF" color="#081019" /></View><Text style={s.eyebrow}>PRIVATE KEY</Text><Text selectable style={s.privateKey}>{verifiedKey}</Text><Button title="Copy private key" secondary onPress={() => { void Clipboard.setStringAsync(verifiedKey); Alert.alert('Copied', 'Anyone with this key can control the wallet.'); }} /><Button title="Hide private key" onPress={() => { setVerifiedKey(''); setIntent(null); setScreen('settings'); }} /></ScrollView>; }
  function renderSettings() { return <ScrollView contentContainerStyle={s.page}><Top title="Wallet settings" back={() => setScreen('home')} /><Text style={s.section}>Wallet profile</Text><View style={s.card}><Text style={s.label}>Wallet icon</Text><View style={s.chips}>{['ETH', 'BTC', 'BNB', 'SOL', 'AVAX', 'USDC'].map((symbol) => <Chip key={symbol} label={symbol} active={editIcon === symbol} onPress={() => setEditIcon(symbol)} />)}</View><Field label="Wallet name" value={editName} onChangeText={setEditName} placeholder="Wallet name" /><Button title="Save wallet profile" onPress={() => void saveWalletProfile()} /></View><Text style={s.section}>Wallets</Text>{wallets.map((item) => <Pressable key={item.id} style={[s.walletItem, active?.id === item.id && s.walletItemActive]} onPress={() => void pickWallet(item)}><View style={s.walletIcon}><Text style={s.walletIconText}>{(item.icon ?? 'ETH').slice(0, 3)}</Text></View><View style={{ flex: 1, marginLeft: 12 }}><Text style={s.assetName}>{item.name}</Text><Text style={s.muted}>{item.address.slice(0, 8)}…{item.address.slice(-6)}</Text></View><Text style={s.check}>{active?.id === item.id ? '✓' : ''}</Text></Pressable>)}<Button title="Add wallet" secondary onPress={() => setScreen('welcome')} /><Text style={s.section}>Security</Text><View style={s.card}><Text style={s.assetName}>Fingerprint unlock</Text><Text style={s.body}>The app offers fingerprint unlock only. Android controls the system authentication prompt; see the known limitation noted in the README.</Text>{fingerprintOn ? <Button title="Disable fingerprint unlock" secondary onPress={() => { void SecureStore.setItemAsync(KEYS.bio, 'false'); setFingerprintOn(false); }} /> : <Button title="Enable fingerprint unlock" secondary onPress={() => void enableFingerprint()} disabled={!fingerprintAvailable} />}</View><Text style={s.section}>Sensitive actions</Text><Button title="Export private key as QR" onPress={() => void beginSensitiveAction('export')} /><Button title="Show recovery phrase" secondary onPress={() => void beginSensitiveAction('phrase')} /><Button title="Delete this wallet" danger onPress={() => void beginSensitiveAction('delete')} /><Button title="Lock Wallet" secondary onPress={() => setScreen('pin')} /><Text style={s.footnote}>Private material is stored in device secure storage and is never sent to the network service.</Text></ScrollView>; }
  function renderScan() { return <View style={s.page}><Top title="Scan QR code" back={() => setScreen(scanImport ? 'import' : 'home')} /><Text style={s.body}>Align the code in the frame. It is read live; no photo is taken.</Text><View style={s.camera}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => handleQr(data)} /><View pointerEvents="none" style={s.scanFrame} /></View><Text style={s.muted}>Only scan codes from a source you trust.</Text></View>; }

  return <SafeAreaView style={s.root} edges={['top', 'bottom', 'left', 'right']}><StatusBar style="light" />{screen === 'welcome' ? renderWelcome() : screen === 'pin' ? (salt ? renderUnlock() : renderPinSetup()) : screen === 'confirmPin' ? renderPinSetup() : screen === 'security' ? renderSecurity() : screen === 'walletName' ? renderWalletName() : screen === 'import' ? renderImport() : screen === 'phrase' ? renderPhrase() : screen === 'backup' ? renderBackup() : screen === 'home' ? renderHome() : screen === 'verify' ? renderVerify() : screen === 'export' ? renderExport() : screen === 'scan' ? renderScan() : renderSettings()}</SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34, backgroundColor: C.bg }, center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: C.bg }, logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 18 }, logoText: { color: C.bg, fontWeight: '900', fontSize: 36 }, brand: { color: C.text, textAlign: 'center', fontSize: 38, fontWeight: '800' }, subtitle: { color: C.muted, textAlign: 'center', marginTop: 8, marginBottom: 30, fontSize: 15 }, top: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, back: { width: 40, height: 40, justifyContent: 'center' }, backText: { color: C.text, fontSize: 36 }, topTitle: { color: C.text, fontSize: 17, fontWeight: '700' }, heading: { color: C.text, fontSize: 27, lineHeight: 35, fontWeight: '800', marginBottom: 10 }, body: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 }, field: { marginBottom: 16 }, label: { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }, input: { minHeight: 53, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, color: C.text, paddingHorizontal: 15, fontSize: 16 }, multiline: { minHeight: 122, textAlignVertical: 'top', paddingTop: 13, lineHeight: 23 }, button: { minHeight: 53, borderRadius: 15, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 }, secondaryButton: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line }, dangerButton: { backgroundColor: '#311A20', borderWidth: 1, borderColor: '#63313B' }, buttonText: { color: C.bg, fontWeight: '800', fontSize: 15 }, secondaryText: { color: C.text }, dangerText: { color: C.red }, disabled: { opacity: 0.4 }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }, footnote: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 17, textAlign: 'center' }, warning: { backgroundColor: '#2C2518', borderRadius: 16, borderWidth: 1, borderColor: '#54462A', padding: 15, marginBottom: 18 }, warningTitle: { color: C.amber, fontSize: 15, fontWeight: '800', marginBottom: 7 }, warningText: { color: C.amber, fontSize: 13, lineHeight: 19, marginBottom: 12 }, words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }, word: { width: '31%', minHeight: 42, borderRadius: 10, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 5 }, wordNumber: { color: C.muted, fontSize: 10, width: 17 }, wordText: { color: C.text, fontSize: 12, fontWeight: '700' },
  home: { flex: 1 }, header: { paddingHorizontal: 19, paddingTop: 13, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, walletName: { color: C.text, fontSize: 20, fontWeight: '800', marginTop: 4 }, more: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.panel, justifyContent: 'center', alignItems: 'center' }, moreText: { color: C.text, fontSize: 17, fontWeight: '900' }, networks: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }, chip: { minHeight: 33, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginRight: 7 }, chipActive: { borderColor: C.green, backgroundColor: '#122D28' }, chipText: { color: C.muted, fontSize: 12, fontWeight: '600' }, chipTextActive: { color: C.green }, tabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingHorizontal: 16 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 13 }, tabActive: { borderBottomColor: C.green, borderBottomWidth: 2 }, tabText: { color: C.muted, fontSize: 14, fontWeight: '600' }, tabTextActive: { color: C.green }, content: { padding: 18, paddingBottom: 35 }, total: { borderRadius: 18, borderWidth: 1, borderColor: '#20493D', backgroundColor: '#10221F', padding: 19, marginBottom: 10 }, totalAmount: { color: C.text, fontSize: 34, fontWeight: '800', marginTop: 10 }, muted: { color: C.muted, fontSize: 12, marginTop: 5 }, section: { color: C.text, fontWeight: '700', fontSize: 18, marginTop: 20, marginBottom: 12 }, asset: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, padding: 13, marginBottom: 9 }, coin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#433A21', justifyContent: 'center', alignItems: 'center' }, stableCoin: { backgroundColor: '#153A54' }, coinText: { color: C.text, fontWeight: '800' }, assetInfo: { flex: 1, marginLeft: 12 }, assetName: { color: C.text, fontSize: 15, fontWeight: '700' }, right: { alignItems: 'flex-end', minWidth: 76 }, card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 15 }, chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 }, sectionPlaceholder: { color: C.text }, cardCenter: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 20, alignItems: 'center' }, qr: { backgroundColor: '#FFF', padding: 14, borderRadius: 16, alignSelf: 'center', marginVertical: 18 }, address: { color: C.text, fontSize: 12, lineHeight: 19, textAlign: 'center', marginBottom: 9 }, walletItem: { minHeight: 61, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, walletItemActive: { borderColor: C.green }, walletIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#153A34', justifyContent: 'center', alignItems: 'center' }, walletIconText: { color: C.green, fontSize: 10, fontWeight: '800' }, check: { color: C.green, fontSize: 18, fontWeight: '800' }, camera: { height: 365, borderRadius: 22, overflow: 'hidden', backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center', marginVertical: 18 }, scanFrame: { width: 230, height: 230, borderWidth: 2, borderColor: C.green, borderRadius: 20 }, privateKey: { color: C.text, fontSize: 12, lineHeight: 19, textAlign: 'center', backgroundColor: C.panel, borderRadius: 12, padding: 12, marginTop: 10 },
});

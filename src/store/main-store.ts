import { Account, User } from '@/types';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import { getPlatforms } from '@ionic/vue';
import { StorageSerializers, useLocalStorage, useStorage, useStorageAsync } from '@vueuse/core';
import { computed, reactive, ref } from 'vue';

export const mainStore = reactive<{
  user?: User;
  decryptedAccounts: Account[];
}>({
  user: undefined,
  decryptedAccounts: []
});

export const accessTokenStorage = useStorageAsync('@authman:access.token', '', SecureStorage);
export const refreshTokenStorage = useStorageAsync('@authman:refresh.token', '', SecureStorage);
export const userStorage = useLocalStorage<User | null>(
  '@authman:user',
  null,
  {
    serializer: StorageSerializers.object
  }
);
export const isLogin = computed(() => accessTokenStorage.value !== '');

export const saltStorage = useStorageAsync('@authman:salt', '', SecureStorage);
export const encSecretStorage = useStorageAsync('@authman:enc.secret', '', SecureStorage);
export const encMasterStorage = useStorageAsync('@authman:enc.master', '', SecureStorage);
export const kekStorage = useStorageAsync('@authman:kek', '', SecureStorage);

export const accountsLoaded = useLocalStorage('@authman:accounts.loaded', false, {
  serializer: StorageSerializers.boolean
});
export const accountsStorage = useLocalStorage<Account<string>[]>('@authman:accounts', []);

// Lock
export const IDLE_TIMEOUT = (Number(import.meta.env.VITE_IDLE_TIMEOUT) || (5 * 60)) * 1000;
export const idleTimeoutEnabled = IDLE_TIMEOUT > 0;
export const lockAtStartup = import.meta.env.VITE_LOCK_SCREEN_AT_STARTUP === '1';
export const isLock = ref(lockAtStartup);
export const noInstantUnlock = ref(false);

// Platform
export const currentPlatform = computed<string>(() => Capacitor.getPlatform());
export const currentPlatforms = ref<ReturnType<typeof getPlatforms>>([]);
export const isElectron = computed(() => currentPlatform.value === 'electron');
export const isWeb = computed(() => currentPlatform.value === 'web');
export const isMobile = computed(() => currentPlatforms.value.includes('mobile'));
export const isDesktop = computed(() => currentPlatforms.value.includes('desktop'));
export const isNative = computed(() => Capacitor.isNativePlatform());

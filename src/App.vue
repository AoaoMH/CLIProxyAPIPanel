<template>
  <SplashScreen
    v-if="showSplash"
    :fade-out="splashReadyToFade && authReady"
    :on-finish="handleSplashFinish"
  />
  <RouterView v-else />
  <ToastHost />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import SplashScreen from '@/components/common/SplashScreen.vue'
import ToastHost from '@/components/common/ToastHost.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const { toast } = useToast()

const SPLASH_DURATION = 1500
const SPLASH_FADE_DURATION = 400

const splashReadyToFade = ref(false)
const showSplash = ref(true)
const authReady = ref(false)
const clientVersion = __APP_VERSION__ || '未知'

onMounted(async () => {
  // Initialize auth store
  authStore.init()

  let autoConnectSuccess = false

  // Try auto-connect if we have stored credentials
  try {
    if (authStore.hasCredentials) {
      const success = await authStore.autoConnect()
      autoConnectSuccess = success
    }
  } catch (error) {
    console.warn('Auto-connect failed:', error)
  } finally {
    authReady.value = true
  }

  if (autoConnectSuccess) {
    await authStore.refreshServerInfo()
  }

  await authStore.checkClientUpdate(clientVersion)
  await authStore.checkServerUpdate()

  if (authStore.hasClientUpdate && authStore.latestClientVersion) {
    toast({ 
      title: '发现新版本', 
      description: `最新版本 ${authStore.latestClientVersion} 可用，当前版本 ${clientVersion}` 
    })
  }

  if (authStore.hasServerUpdate && authStore.latestServerVersion && authStore.serverVersion) {
    toast({ 
      title: '服务器有新版本', 
      description: `最新版本 ${authStore.latestServerVersion} 可用，当前版本 ${authStore.serverVersion}` 
    })
  }

  // Start splash fade timer
  setTimeout(() => {
    splashReadyToFade.value = true
  }, SPLASH_DURATION - SPLASH_FADE_DURATION)

  // Handle navigation after splash finishes
  setTimeout(async () => {
    await nextTick()
    
    const currentPath = router.currentRoute.value.path
    
    if (autoConnectSuccess && currentPath === '/login') {
      // Auto-connect succeeded, go to dashboard
      await router.replace('/dashboard')
    } else if (!autoConnectSuccess && currentPath !== '/login') {
      // Auto-connect failed but trying to access protected route, go to connect page
      await router.replace('/login')
    }
    // Otherwise, stay on current route
  }, SPLASH_DURATION + 50)
})

function handleSplashFinish() {
  showSplash.value = false
}
</script>

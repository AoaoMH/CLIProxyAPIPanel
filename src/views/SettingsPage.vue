<template>
  <PageContainer>
    <!-- 直接显示内容，去掉页面标题 -->

    <!-- Connection Settings -->
    <Section title="连接设置" class="mb-8">
      <div class="space-y-4">
        <CardSection>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">服务器地址</label>
              <Input v-model="settings.apiBase" placeholder="http://localhost:8080" />
              <p class="text-xs text-muted-foreground mt-1">当前: {{ authStore.apiBase }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">管理密钥</label>
              <div class="relative">
                <Input
                  v-model="settings.managementKey"
                  :type="showKey ? 'text' : 'password'"
                  placeholder="输入新的管理密钥"
                  class="pr-10"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground motion-transition"
                  @click="showKey = !showKey"
                >
                  <EyeOff v-if="showKey" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <Button variant="outline" @click="testConnection" :disabled="testing">
                <Loader2 v-if="testing" class="w-4 h-4 mr-2 animate-spin" />
                测试连接
              </Button>
              <Button @click="updateConnection" :disabled="!hasConnectionChanges">
                更新连接
              </Button>
            </div>
          </div>
        </CardSection>
      </div>
    </Section>

    <!-- Appearance -->
    <Section title="外观" class="mb-8">
      <CardSection>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-foreground">主题</h3>
            <p class="text-sm text-muted-foreground">选择您喜欢的配色方案</p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              :variant="themeMode === 'light' ? 'default' : 'outline'"
              size="sm"
              @click="setTheme('light')"
            >
              <SunMedium class="w-4 h-4 mr-2" />
              浅色
            </Button>
            <Button
              :variant="themeMode === 'dark' ? 'default' : 'outline'"
              size="sm"
              @click="setTheme('dark')"
            >
              <Moon class="w-4 h-4 mr-2" />
              深色
            </Button>
            <Button
              :variant="themeMode === 'system' ? 'default' : 'outline'"
              size="sm"
              @click="setTheme('system')"
            >
              <Monitor class="w-4 h-4 mr-2" />
              系统
            </Button>
          </div>
        </div>
      </CardSection>
    </Section>

    <!-- Backend Config (moved to visual config) -->
    <Section title="后端配置" class="mb-8">
      <CardSection>
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="font-medium text-foreground">已迁移到可视化配置</h3>
            <p class="text-sm text-muted-foreground">
              调试、代理、WebSocket 认证等服务端配置请在「配置管理 → 可视化编辑」中修改
            </p>
          </div>
          <Button variant="outline" size="sm" @click="goToConfig">前往配置管理</Button>
        </div>
      </CardSection>
    </Section>

    <!-- About -->
    <Section title="关于">
      <CardSection>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-muted-foreground">客户端版本</span>
            <div class="flex items-center gap-2">
              <span class="text-foreground font-mono">{{ clientVersion }}</span>
              <div v-if="checkingClientUpdate" class="flex items-center text-muted-foreground">
                <Loader2 class="w-3 h-3 animate-spin mr-1" />
                <span class="text-xs">检查更新中...</span>
              </div>
              <div v-else-if="hasClientUpdate" class="flex items-center gap-2">
                <span class="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/25 dark:text-orange-300 px-2 py-1 rounded">
                  有新版本 {{ latestClientVersion }}
                </span>
                <Button 
                  size="sm" 
                  @click="updateWebUI"
                  :disabled="updating"
                  class="text-xs"
                >
                  <Loader2 v-if="updating" class="w-3 h-3 animate-spin mr-1" />
                  {{ updating ? '更新中...' : '立即更新' }}
                </Button>
              </div>
            </div>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">服务器版本</span>
            <div class="flex items-center gap-2">
              <span class="text-foreground font-mono">{{ authStore.serverVersion || '未知' }}</span>
              <div v-if="checkingServerUpdate" class="flex items-center text-muted-foreground">
                <Loader2 class="w-3 h-3 animate-spin mr-1" />
                <span class="text-xs">检查更新中...</span>
              </div>
              <span v-else-if="hasServerUpdate" class="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/25 dark:text-orange-300 px-2 py-1 rounded">
                有新版本 {{ latestServerVersion }}
              </span>
            </div>
          </div>
        </div>
      </CardSection>
    </Section>

    <!-- Disconnect Button -->
    <div class="mt-8">
      <Button variant="destructive" class="w-full" @click="handleDisconnect">
        <LogOut class="w-4 h-4 mr-2" />
        断开连接
      </Button>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiClient } from '@/api/client'
import PageContainer from '@/components/layout/PageContainer.vue'
import CardSection from '@/components/layout/CardSection.vue'
import Section from '@/components/layout/Section.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import {
  Eye,
  EyeOff,
  SunMedium,
  Moon,
  Monitor,
  LogOut,
  Loader2,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const { themeMode, setThemeMode } = useDarkMode()
const { toast } = useToast()
const { confirmInfo } = useConfirm()

const showKey = ref(false)
const testing = ref(false)
const updating = ref(false)

// 获取客户端版本
const clientVersion = __APP_VERSION__ || '未知'
const checkingClientUpdate = computed(() => authStore.checkingClientUpdate)
const latestClientVersion = computed(() => authStore.latestClientVersion)
const hasClientUpdate = computed(() => authStore.hasClientUpdate)
const checkingServerUpdate = computed(() => authStore.checkingServerUpdate)
const latestServerVersion = computed(() => authStore.latestServerVersion)
const hasServerUpdate = computed(() => authStore.hasServerUpdate)

const settings = reactive({
  apiBase: authStore.apiBase,
  managementKey: '',
})

const hasConnectionChanges = computed(() => {
  return settings.apiBase !== authStore.apiBase || settings.managementKey.trim() !== ''
})

// 更新 WebUI
async function updateWebUI() {
  if (!latestClientVersion.value || updating.value) return
  
  updating.value = true
  try {
    await apiClient.post('/webui/update', { version: latestClientVersion.value })
    
    // 显示成功提示
    toast({
      title: '更新完成',
      description: `WebUI 已更新到版本 ${latestClientVersion.value}`
    })
    
    // 询问是否刷新
    setTimeout(async () => {
      if (await confirmInfo('WebUI 更新完成，是否刷新页面以应用更新？')) {
        window.location.reload()
      }
    }, 1000)
    
    authStore.hasClientUpdate = false
  } catch (error) {
    toast({ 
      title: '更新失败', 
      description: (error as Error).message,
      variant: 'destructive' 
    })
  } finally {
    updating.value = false
  }
}

function setTheme(mode: 'light' | 'dark' | 'system') {
  setThemeMode(mode)
}

function goToConfig() {
  router.push('/config')
}

async function testConnection() {
  testing.value = true
  try {
    const baseToUse = settings.apiBase || authStore.apiBase
    const keyToUse = settings.managementKey || authStore.managementKey

    apiClient.setConfig({
      apiBase: baseToUse,
      managementKey: keyToUse,
    })

    await apiClient.get('/config')
    toast({ title: '连接成功' })
  } catch {
    toast({ title: '连接失败', variant: 'destructive' })
    // Restore original config
    apiClient.setConfig({
      apiBase: authStore.apiBase,
      managementKey: authStore.managementKey,
    })
  } finally {
    testing.value = false
  }
}

async function updateConnection() {
  try {
    const success = await authStore.connect({
      apiBase: settings.apiBase || authStore.apiBase,
      managementKey: settings.managementKey || authStore.managementKey,
    })

    if (success) {
      toast({ title: '连接已更新' })
      settings.managementKey = ''
    } else {
      toast({ title: '更新连接失败', variant: 'destructive' })
    }
  } catch {
    toast({ title: '更新连接失败', variant: 'destructive' })
  }
}

function handleDisconnect() {
  authStore.disconnect()
  router.push('/')
}
</script>

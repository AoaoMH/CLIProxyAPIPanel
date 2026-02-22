<template>
  <AppShell
    :show-notice="showAuthError"
    :main-class="mainClasses"
    :sidebar-class="sidebarClasses"
    :content-class="contentClasses"
  >
    <!-- GLOBAL TEXTURE (Paper Noise) -->
    <div
      class="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-multiply fixed"
      :style="{ backgroundImage: `url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E&quot;)` }"
    />

    <template #notice>
      <div class="flex w-full max-w-3xl items-center justify-between rounded-3xl bg-orange-500 px-6 py-3 text-white shadow-2xl ring-1 ring-white/30">
        <div class="flex items-center gap-3">
          <AlertTriangle class="h-5 w-5" />
          <span>连接已过期，请重新连接</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="border-white/60 text-white hover:bg-white/10"
          @click="handleReconnect"
        >
          重新连接
        </Button>
      </div>
    </template>

    <template #sidebar>
      <!-- HEADER (Brand) -->
      <div class="shrink-0 flex items-center px-6 h-20">
        <RouterLink
          to="/dashboard"
          class="flex items-center gap-3 group motion-transition hover:opacity-80"
        >
          <div class="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Server class="w-5 h-5 text-primary" />
          </div>
          <div class="flex flex-col justify-center">
            <h1 class="text-lg font-bold text-[#191919] dark:text-white leading-none">
              CLI Proxy API
            </h1>
            <span class="text-[10px] text-[#91918d] dark:text-muted-foreground leading-none mt-1.5 font-medium tracking-wide">管理面板</span>
          </div>
        </RouterLink>
      </div>

      <!-- NAVIGATION -->
      <div class="flex-1 overflow-y-auto py-4 scrollbar-thin px-2">
        <SidebarNav
          :items="navigation"
          :is-active="isNavActive"
        />
      </div>

      <!-- FOOTER (Connection Info) -->
      <div class="p-4 border-t border-[#3d3929]/5 dark:border-white/5 bg-[#faf9f5]/50 dark:bg-[#1e1c19]/50 backdrop-blur-sm">
        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 motion-transition">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center shrink-0 shadow-sm"
              :class="authStore.isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'"
            >
              <div class="w-2 h-2 rounded-full motion-safe:animate-pulse"
                :class="authStore.isConnected ? 'bg-green-500' : 'bg-red-500'"
              />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold leading-none truncate opacity-90 text-foreground">
                {{ authStore.isConnected ? '已连接' : '未连接' }}
              </span>
              <span class="text-[10px] opacity-60 leading-none mt-1.5 text-muted-foreground truncate max-w-[140px] font-mono">
                {{ authStore.serverVersion ? `v${authStore.serverVersion}` : authStore.apiBase || '未连接' }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <RouterLink
              to="/settings"
              class="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground motion-transition"
              title="设置"
            >
              <Settings class="w-4 h-4" />
            </RouterLink>
            <button
              class="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 motion-transition"
              title="断开连接"
              @click="handleDisconnect"
            >
              <LogOut class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #header>
      <!-- Mobile Header -->
      <header class="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/70 bg-background/95 text-foreground backdrop-blur-xl motion-transition">
        <div class="mx-auto max-w-7xl px-6 py-4">
          <div class="flex items-center justify-between">
            <!-- Logo & Brand -->
            <RouterLink
              to="/dashboard"
              class="flex items-center gap-3 group"
            >
              <div class="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Server class="w-5 h-5 text-primary" />
              </div>
              <div class="flex flex-col justify-center">
                <h1 class="text-lg font-bold text-[#191919] dark:text-white leading-none">
                  CLI Proxy API
                </h1>
                <span class="text-[10px] text-[#91918d] dark:text-muted-foreground leading-none mt-1.5 font-medium tracking-wide">管理面板</span>
              </div>
            </RouterLink>

            <!-- Right Actions -->
            <div class="flex items-center gap-3">
              <button
                class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 motion-transition"
                :title="themeMode === 'system' ? '跟随系统' : themeMode === 'dark' ? '深色模式' : '浅色模式'"
                @click="toggleDarkMode"
              >
                <SunMoon
                  v-if="themeMode === 'system'"
                  class="h-4 w-4"
                />
                <SunMedium
                  v-else-if="themeMode === 'light'"
                  class="h-4 w-4"
                />
                <Moon
                  v-else
                  class="h-4 w-4"
                />
              </button>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 motion-transition"
                @click="mobileMenuOpen = !mobileMenuOpen"
              >
                <div class="relative w-5 h-5">
                  <Transition
                    enter-active-class="motion-transition"
                    enter-from-class="opacity-0 rotate-90 scale-75"
                    enter-to-class="opacity-100 rotate-0 scale-100"
                    leave-active-class="motion-transition absolute inset-0"
                    leave-from-class="opacity-100 rotate-0 scale-100"
                    leave-to-class="opacity-0 -rotate-90 scale-75"
                    mode="out-in"
                  >
                    <Menu
                      v-if="!mobileMenuOpen"
                      class="h-5 w-5"
                    />
                    <X
                      v-else
                      class="h-5 w-5"
                    />
                  </Transition>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Dropdown Menu -->
        <Transition
          enter-active-class="motion-transition overflow-hidden"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[500px]"
          leave-active-class="motion-transition overflow-hidden"
          leave-from-class="opacity-100 max-h-[500px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="mobileMenuOpen"
            class="border-t border-border/70 bg-background text-foreground backdrop-blur-xl"
          >
            <div class="mx-auto max-w-7xl px-6 py-4">
              <!-- Navigation Groups -->
              <div class="space-y-4">
                <div
                  v-for="group in navigation"
                  :key="group.title"
                >
                  <div
                    v-if="group.title"
                    class="text-[10px] font-semibold text-[#91918d] dark:text-muted-foreground uppercase tracking-wider mb-2"
                  >
                    {{ group.title }}
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <RouterLink
                      v-for="item in group.items"
                      :key="item.href"
                      :to="item.href"
                      class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium motion-transition"
                      :class="isNavActive(item.href)
                        ? 'bg-[#cc785c]/10 dark:bg-[#cc785c]/20 text-[#cc785c] dark:text-[#d4a27f]'
                        : 'text-[#666663] dark:text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#191919] dark:hover:text-white'"
                      @click="mobileMenuOpen = false"
                    >
                      <component
                        :is="item.icon"
                        class="h-4 w-4 shrink-0"
                      />
                      <span class="flex items-center gap-1 min-w-0">
                        <span class="truncate">{{ item.name }}</span>
                        <span v-if="item.badge" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          {{ item.badge }}
                        </span>
                      </span>
                    </RouterLink>
                  </div>
                </div>
              </div>

              <!-- Connection Section -->
              <div class="mt-4 pt-4 border-t border-[#cc785c]/10 dark:border-[rgba(227,224,211,0.12)]">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center shrink-0"
                      :class="authStore.isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'"
                    >
                      <div class="w-2 h-2 rounded-full"
                        :class="authStore.isConnected ? 'bg-green-500' : 'bg-red-500'"
                      />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-semibold leading-none truncate text-[#191919] dark:text-white">
                        {{ authStore.isConnected ? '已连接' : '未连接' }}
                      </span>
                      <span class="text-[10px] text-[#91918d] dark:text-muted-foreground leading-none mt-1">
                        {{ authStore.serverVersion ? `v${authStore.serverVersion}` : '' }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <RouterLink
                      to="/settings"
                      class="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground motion-transition"
                      @click="mobileMenuOpen = false"
                    >
                      <Settings class="w-4 h-4" />
                    </RouterLink>
                    <button
                      class="p-2 rounded-lg text-muted-foreground hover:text-red-500 motion-transition"
                      @click="handleDisconnect"
                    >
                      <LogOut class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </header>

      <!-- Desktop Page Header - 只显示面包屑导航 -->
      <header class="hidden lg:flex h-12 px-6 items-center shrink-0 border-b border-[#3d3929]/5 dark:border-white/5 sticky top-0 z-40 backdrop-blur-md bg-[#faf9f5]/90 dark:bg-[#191714]/90">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{{ currentSectionName }}</span>
          <ChevronRight class="w-3 h-3 opacity-50" />
          <span class="text-foreground font-medium">{{ currentPageName }}</span>
        </div>
      </header>
    </template>

    <RouterView />
  </AppShell>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import Button from '@/components/ui/button.vue'
import AppShell from '@/components/layout/AppShell.vue'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import {
  Home,
  Key,
  Bot,
  FileText,
  Fingerprint,
  BarChart3,
  ScrollText,
  FileCode,
  Archive,
  Settings,
  AlertTriangle,
  SunMedium,
  Moon,
  LogOut,
  SunMoon,
  ChevronRight,
  Menu,
  X,
  Server,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { themeMode, toggleDarkMode } = useDarkMode()

const showAuthError = ref(false)
const mobileMenuOpen = ref(false)
let authCheckInterval: number | null = null
const hasUpdateBadge = computed(() => authStore.hasClientUpdate || authStore.hasServerUpdate)

// Auto close mobile menu on route change
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

onMounted(() => {
  authCheckInterval = window.setInterval(() => {
    if (!authStore.isConnected && route.path !== '/login') {
      showAuthError.value = true
    }
  }, 5000)
})

onUnmounted(() => {
  if (authCheckInterval) {
    clearInterval(authCheckInterval)
    authCheckInterval = null
  }
})

function handleReconnect() {
  showAuthError.value = false
  router.push('/')
}

function handleDisconnect() {
  authStore.disconnect()
  router.push('/')
}

function isNavActive(href: string) {
  if (href === '/dashboard') {
    return route.path === href
  }
  return route.path === href || route.path.startsWith(`${href}/`)
}

// Navigation Data
const navigation = computed(() => [
  {
    title: '概览',
    items: [
      { name: '仪表盘', href: '/dashboard', icon: Home },
    ]
  },
  {
    title: '资源',
    items: [
      { name: 'API 密钥', href: '/api-keys', icon: Key },
      { name: 'AI 提供商', href: '/ai-providers', icon: Bot },
      { name: '认证文件', href: '/auth-files', icon: FileText },
      { name: 'OAuth', href: '/oauth', icon: Fingerprint },
    ]
  },
  {
    title: '统计',
    items: [
      { name: '使用记录', href: '/usage', icon: BarChart3 },
      { name: '日志', href: '/logs', icon: ScrollText },
    ]
  },
  {
    title: '系统',
    items: [
      { name: '配置', href: '/config', icon: FileCode },
      { name: '备份', href: '/backup', icon: Archive },
      { name: '设置', href: '/settings', icon: Settings, badge: hasUpdateBadge.value ? 'NEW' : undefined },
    ]
  }
])

// Dynamic Header Title
const currentSectionName = computed(() => {
  for (const group of navigation.value) {
    const hasActiveItem = group.items.some(item => isNavActive(item.href))
    if (hasActiveItem) {
      return group.title || ''
    }
  }
  return ''
})

const currentPageName = computed(() => {
  const allItems = navigation.value.flatMap(group => group.items)
  const active = allItems.find(item => isNavActive(item.href))
  return active ? active.name : route.name?.toString() || '仪表盘'
})

// Styling Classes (Editorial)
const sidebarClasses = computed(() => {
  return `w-[260px] flex flex-col hidden lg:flex border-r border-[#3d3929]/5 dark:border-white/5 bg-[#faf9f5] dark:bg-[#1e1c19] h-screen sticky top-0`
})

const contentClasses = computed(() => {
  return `flex-1 min-w-0 bg-[#faf9f5] dark:bg-[#191714] text-[#3d3929] dark:text-[#d4a27f]`
})

const mainClasses = computed(() => {
  return `pt-24 lg:pt-12` // 为面包屑留出空间
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>

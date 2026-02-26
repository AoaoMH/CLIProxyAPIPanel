<template>
  <PageContainer>
    <!-- 直接显示内容，去掉页面标题 -->

    <!-- OAuth Providers -->
    <Section title="支持的提供商" class="mb-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardSection
          v-for="provider in providers"
          :key="provider.id"
          class="flex flex-col"
        >
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <component :is="provider.icon" class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 class="font-medium text-foreground">{{ provider.name }}</h3>
              <p class="text-xs text-muted-foreground">{{ provider.description }}</p>
            </div>
          </div>
          <div class="mt-auto">
            <Button
              size="sm"
              class="w-full"
              @click="startAuth(provider)"
              :disabled="loadingProvider === provider.id"
            >
              <Loader2 v-if="loadingProvider === provider.id" class="w-4 h-4 mr-2 animate-spin" />
              <ExternalLink v-else class="w-4 h-4 mr-2" />
              开始认证
            </Button>
          </div>
        </CardSection>
      </div>
    </Section>

    <Section title="iFlow Cookie 授权" class="mb-8">
      <CardSection>
        <div class="flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Cloud class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-foreground">iFlow</div>
              <div class="text-xs text-muted-foreground">
                点击开始授权后展开输入框，粘贴 Cookie 完成授权（无需打开授权链接）
              </div>
            </div>
          </div>
 
          <div class="flex gap-2">
            <Button size="sm" class="w-full" @click="toggleIflowCookie" :disabled="iflowCookieSubmitting">
              <Loader2 v-if="iflowCookieSubmitting" class="w-4 h-4 mr-2 animate-spin" />
              <ExternalLink v-else class="w-4 h-4 mr-2" />
              {{ iflowCookieExpanded ? '收起' : '开始授权' }}
            </Button>
          </div>
 
          <div v-if="iflowCookieExpanded" class="space-y-3">
            <div>
              <label class="text-sm font-medium text-foreground mb-1 block">Cookie 内容</label>
              <div class="text-xs text-muted-foreground mb-2">从浏览器复制完整 Cookie（需包含 BXAuth=...）</div>
              <Textarea
                v-model="iflowCookieValue"
                placeholder="粘贴浏览器中的 Cookie，例如 BXAuth=...;"
                class="min-h-[120px]"
                :disabled="iflowCookieSubmitting"
              />
            </div>
 
            <div class="flex gap-2">
              <Button size="sm" @click="submitIflowCookie" :disabled="iflowCookieSubmitting || !iflowCookieValue.trim()">
                <Loader2 v-if="iflowCookieSubmitting" class="w-4 h-4 mr-2 animate-spin" />
                提交 Cookie 授权
              </Button>
              <Button variant="outline" size="sm" @click="clearIflowCookieResult" :disabled="iflowCookieSubmitting">
                清空结果
              </Button>
            </div>
 
            <div v-if="iflowCookieResult" class="p-3 bg-muted/30 rounded-lg space-y-1">
              <div class="text-sm text-foreground">授权成功</div>
              <div class="text-xs text-muted-foreground">账号：<span class="font-mono">{{ iflowCookieResult.email }}</span></div>
              <div class="text-xs text-muted-foreground">过期时间：<span class="font-mono">{{ iflowCookieResult.expired }}</span></div>
              <div class="text-xs text-muted-foreground">保存路径：<span class="font-mono break-all">{{ iflowCookieResult.saved_path }}</span></div>
              <div v-if="iflowCookieResult.replaced" class="text-xs text-muted-foreground">已覆盖旧凭证</div>
            </div>
          </div>
        </div>
      </CardSection>
    </Section>
 
    <!-- Active Auth Flow -->
    <Section v-if="activeFlow" title="认证进行中">
      <CardSection>
        <div class="flex flex-col gap-4">
          <div class="flex items-start gap-6">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-foreground mb-2">{{ activeFlow.providerName }} 设备授权</h3>
              <p class="text-sm text-muted-foreground mb-4">
                请访问以下链接完成认证。认证完成后，令牌将自动保存到服务器。
              </p>
              <div class="space-y-3">
                <div class="p-3 bg-muted/30 rounded-lg">
                  <div class="text-xs text-muted-foreground mb-1">认证地址</div>
                  <a
                    :href="activeFlow.url"
                    target="_blank"
                    class="text-primary hover:underline font-mono text-sm break-all"
                  >
                    {{ activeFlow.url }}
                  </a>
                </div>
                <div v-if="activeFlow.userCode" class="p-3 bg-muted/30 rounded-lg">
                  <div class="text-xs text-muted-foreground mb-1">用户码</div>
                  <div class="flex items-center gap-3">
                    <span class="font-mono text-2xl font-bold tracking-wider">{{ activeFlow.userCode }}</span>
                    <Button variant="ghost" size="sm" @click="copyCode(activeFlow.userCode)">
                      <Copy class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div class="mt-4 flex gap-2">
                <Button variant="outline" size="sm" @click="openUrl(activeFlow.url)">
                  <ExternalLink class="w-4 h-4 mr-2" />
                  在浏览器中打开
                </Button>
                <Button variant="outline" size="sm" @click="copyUrl(activeFlow.url)">
                  <Copy class="w-4 h-4 mr-2" />
                  复制链接
                </Button>
                <Button variant="ghost" size="sm" @click="cancelAuth">
                  取消
                </Button>
              </div>
            </div>
          </div>

          <!-- Callback URL Section -->
          <div v-if="activeFlow.supportsCallback" class="border-t border-border pt-4">
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-foreground mb-1 block">回调 URL</label>
                <p class="text-xs text-muted-foreground mb-2">
                  在浏览器中完成登录后，将跳转后的完整 URL 粘贴到这里
                </p>
              </div>
              <div class="flex gap-2">
                <Input
                  v-model="activeFlow.callbackUrl"
                  placeholder="https://..."
                  class="flex-1"
                  :disabled="activeFlow.callbackSubmitting"
                />
                <Button
                  size="sm"
                  @click="submitCallback"
                  :disabled="activeFlow.callbackSubmitting || !activeFlow.callbackUrl?.trim()"
                >
                  <Loader2 v-if="activeFlow.callbackSubmitting" class="w-4 h-4 mr-2 animate-spin" />
                  提交回调
                </Button>
              </div>
              <!-- Callback Status -->
              <div v-if="activeFlow.callbackStatus === 'success'" class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle class="w-4 h-4" />
                回调已提交，正在等待服务器处理...
              </div>
              <div v-else-if="activeFlow.callbackStatus === 'error'" class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <XCircle class="w-4 h-4" />
                {{ activeFlow.callbackError || '提交失败' }}
              </div>
            </div>
          </div>

          <!-- Polling Status -->
          <div v-if="activeFlow.polling" class="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
            <Loader2 class="w-4 h-4 animate-spin" />
            正在等待认证完成...
          </div>
          <div v-else-if="activeFlow.status === 'success'" class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 border-t border-border pt-4">
            <CheckCircle class="w-4 h-4" />
            认证成功！
          </div>
          <div v-else-if="activeFlow.status === 'error'" class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 border-t border-border pt-4">
            <XCircle class="w-4 h-4" />
            {{ activeFlow.error || '认证失败' }}
          </div>
        </div>
      </CardSection>
    </Section>

    <!-- Auth Status -->
    <Section title="认证状态">
      <div v-if="loadingStatus" class="flex justify-center py-8">
        <Loader2 class="w-6 h-6 animate-spin text-primary" />
      </div>

      <div v-else-if="Object.keys(authStatus).length === 0" class="text-center py-8 text-muted-foreground">
        暂无认证状态信息
      </div>

      <div v-else class="space-y-2">
        <CardSection
          v-for="(status, provider) in authStatus"
          :key="provider"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :class="status.authenticated ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'"
            >
              <CheckCircle v-if="status.authenticated" class="w-5 h-5 text-green-500" />
              <XCircle v-else class="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div class="font-medium text-foreground capitalize">{{ provider }}</div>
              <div class="text-xs text-muted-foreground">
                {{ status.authenticated ? '已认证' : '未开始' }}
                <span v-if="status.count"> - {{ status.count }} 个凭证</span>
              </div>
            </div>
          </div>
          <Button
            v-if="status.authenticated"
            variant="ghost"
            size="sm"
            @click="refreshStatus"
          >
            <RefreshCw class="w-4 h-4" />
          </Button>
        </CardSection>
      </div>
    </Section>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, markRaw, type Component } from 'vue'
import { apiClient } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { useClipboard } from '@/composables/useClipboard'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import CardSection from '@/components/layout/CardSection.vue'
import Section from '@/components/layout/Section.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import Textarea from '@/components/ui/textarea.vue'
import {
  Bot,
  Sparkles,
  Code,
  Cpu,
  Key,
  Zap,
  Cloud,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-vue-next'

interface OAuthProvider {
  id: string
  name: string
  description: string
  endpoint: string
  icon: Component
  supportsCallback?: boolean
}

interface ActiveFlow {
  providerId: string
  providerName: string
  url: string
  userCode?: string
  state?: string
  supportsCallback?: boolean
  callbackUrl?: string
  callbackSubmitting?: boolean
  callbackStatus?: 'success' | 'error'
  callbackError?: string
  polling?: boolean
  status?: 'waiting' | 'success' | 'error'
  error?: string
}

interface AuthStatusItem {
  authenticated: boolean
  count?: number
}

const { toast } = useToast()
const { copy } = useClipboard()

const loadingStatus = ref(true)
const loadingProvider = ref<string | null>(null)
const activeFlow = ref<ActiveFlow | null>(null)
const authStatus = ref<Record<string, AuthStatusItem>>({})
const geminiProjectId = ref('')
let pollingTimer: number | null = null

interface IFlowCookieResult {
  saved_path: string
  email: string
  expired: string
  type: string
  replaced?: boolean
}
 
const iflowCookieExpanded = ref(false)
const iflowCookieValue = ref('')
const iflowCookieSubmitting = ref(false)
const iflowCookieResult = ref<IFlowCookieResult | null>(null)
 
// 支持回调的提供商
const CALLBACK_SUPPORTED = ['codex', 'anthropic', 'antigravity', 'gemini']
// 回调接口的提供商名称映射
const CALLBACK_PROVIDER_MAP: Record<string, string> = {
  'gemini': 'gemini'
}

const providers: OAuthProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude AI 模型',
    endpoint: '/anthropic-auth-url',
    icon: markRaw(Bot),
    supportsCallback: true,
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    description: 'Google Gemini 模型',
    endpoint: '/gemini-cli-auth-url',
    icon: markRaw(Sparkles),
    supportsCallback: true,
  },
  {
    id: 'codex',
    name: 'Codex (OpenAI)',
    description: 'OpenAI Codex 模型',
    endpoint: '/codex-auth-url',
    icon: markRaw(Code),
    supportsCallback: true,
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    description: 'Antigravity AI',
    endpoint: '/antigravity-auth-url',
    icon: markRaw(Zap),
    supportsCallback: true,
  },
  {
    id: 'kimi',
    name: 'Kimi Code',
    description: 'Kimi 编程模型',
    endpoint: '/kimi-auth-url',
    icon: markRaw(Key),
    supportsCallback: false,
  },
  {
    id: 'qwen',
    name: 'Qwen',
    description: '通义千问模型',
    endpoint: '/qwen-auth-url',
    icon: markRaw(Cpu),
    supportsCallback: false,
  },
]

async function copyCode(code: string) {
  await copy(code)
  toast({ title: '已复制到剪贴板' })
}

async function copyUrl(url: string) {
  await copy(url)
  toast({ title: '链接已复制' })
}

function openUrl(url: string) {
  window.open(url, '_blank')
}

function toggleIflowCookie() {
  iflowCookieExpanded.value = !iflowCookieExpanded.value
}
 
function clearIflowCookieResult() {
  iflowCookieResult.value = null
}
 
async function submitIflowCookie() {
  if (iflowCookieSubmitting.value) return
  const cookie = iflowCookieValue.value.trim()
  if (!cookie) {
    toast({ title: '请先填写 Cookie 内容', variant: 'destructive' })
    return
  }
 
  iflowCookieSubmitting.value = true
  try {
    const res = await apiClient.post<IFlowCookieResult & { status?: string }>('/iflow-auth-url', { cookie })
    iflowCookieResult.value = res
    toast({ title: res?.replaced ? '授权成功，已覆盖旧凭证' : '授权成功' })
    fetchAuthStatus()
  } catch (err: unknown) {
    const error = err as { message?: string }
    toast({ title: error?.message || '授权失败', variant: 'destructive' })
  } finally {
    iflowCookieSubmitting.value = false
  }
}
 
function stopPolling() {
  if (pollingTimer !== null) {
    window.clearInterval(pollingTimer)
    pollingTimer = null
  }
}

function startPolling(state: string) {
  stopPolling()
  pollingTimer = window.setInterval(async () => {
    try {
      const res = await apiClient.get<{ status: 'ok' | 'wait' | 'error'; error?: string }>('/get-auth-status', {
        params: { state }
      })
      if (res.status === 'ok') {
        if (activeFlow.value) {
          activeFlow.value.status = 'success'
          activeFlow.value.polling = false
        }
        toast({ title: '认证成功！' })
        stopPolling()
        fetchAuthStatus()
      } else if (res.status === 'error') {
        if (activeFlow.value) {
          activeFlow.value.status = 'error'
          activeFlow.value.error = res.error
          activeFlow.value.polling = false
        }
        toast({ title: `认证失败: ${res.error || '未知错误'}`, variant: 'destructive' })
        stopPolling()
      }
      // 'wait' 状态继续轮询
    } catch (err: unknown) {
      const error = err as { message?: string }
      if (activeFlow.value) {
        activeFlow.value.status = 'error'
        activeFlow.value.error = error?.message
        activeFlow.value.polling = false
      }
      stopPolling()
    }
  }, 3000)
}

async function startAuth(provider: OAuthProvider) {
  loadingProvider.value = provider.id
  try {
    // 构建请求参数
    const params: Record<string, string | boolean> = { is_webui: true }
    if (provider.id === 'gemini' && geminiProjectId.value.trim()) {
      params.project_id = geminiProjectId.value.trim()
    }

    const data = await apiClient.get<{ url?: string; auth_url?: string; user_code?: string; state?: string }>(
      provider.endpoint,
      { params }
    )
    const url = data?.url || data?.auth_url
    if (url) {
      activeFlow.value = {
        providerId: provider.id,
        providerName: provider.name,
        url,
        userCode: data?.user_code,
        state: data?.state,
        supportsCallback: CALLBACK_SUPPORTED.includes(provider.id),
        callbackUrl: '',
        callbackSubmitting: false,
        polling: !!data?.state,
        status: 'waiting',
      }
      // 如果有 state，开始轮询
      if (data?.state) {
        startPolling(data.state)
      }
      toast({ title: `${provider.name} 认证已启动，请手动打开或复制链接完成认证` })
    } else {
      toast({ title: '获取认证链接失败', variant: 'destructive' })
    }
  } catch {
    toast({ title: `启动 ${provider.name} 认证失败`, variant: 'destructive' })
  } finally {
    loadingProvider.value = null
  }
}

async function submitCallback() {
  if (!activeFlow.value) return
  const redirectUrl = activeFlow.value.callbackUrl?.trim()
  if (!redirectUrl) {
    toast({ title: '请输入回调 URL', variant: 'destructive' })
    return
  }

  activeFlow.value.callbackSubmitting = true
  activeFlow.value.callbackStatus = undefined
  activeFlow.value.callbackError = undefined

  try {
    const callbackProvider = CALLBACK_PROVIDER_MAP[activeFlow.value.providerId] ?? activeFlow.value.providerId
    await apiClient.post('/oauth-callback', {
      provider: callbackProvider,
      redirect_url: redirectUrl
    })
    activeFlow.value.callbackSubmitting = false
    activeFlow.value.callbackStatus = 'success'
    toast({ title: '回调已提交成功' })
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string }
    activeFlow.value.callbackSubmitting = false
    activeFlow.value.callbackStatus = 'error'
    if (error?.status === 404) {
      activeFlow.value.callbackError = '服务器不支持此功能，请升级 CLI Proxy API'
    } else {
      activeFlow.value.callbackError = error?.message || '提交失败'
    }
    toast({ title: activeFlow.value.callbackError, variant: 'destructive' })
  }
}

function cancelAuth() {
  stopPolling()
  activeFlow.value = null
}

async function fetchAuthStatus() {
  loadingStatus.value = true
  try {
    const data = await apiClient.get<Record<string, AuthStatusItem>>('/get-auth-status')
    authStatus.value = data || {}
  } catch {
    // Endpoint might not exist or return different format
    authStatus.value = {}
  } finally {
    loadingStatus.value = false
  }
}

async function refreshStatus() {
  await fetchAuthStatus()
  toast({ title: '状态已刷新' })
}

onMounted(fetchAuthStatus)

onUnmounted(() => {
  stopPolling()
})
</script>

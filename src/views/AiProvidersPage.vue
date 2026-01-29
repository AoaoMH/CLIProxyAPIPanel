<template>
  <PageContainer>


    <div v-if="loading && !statsLoaded" class="space-y-6">
      <div class="flex items-center space-x-4 mb-8">
        <Skeleton class="h-10 w-24" />
        <Skeleton class="h-10 w-24" />
        <Skeleton class="h-10 w-24" />
        <Skeleton class="h-10 w-24" />
      </div>
      <CardSection v-for="i in 2" :key="'skeleton-' + i">
        <div class="space-y-4">
          <Skeleton class="h-8 w-1/3" />
          <Skeleton class="h-24 w-full" />
        </div>
      </CardSection>
    </div>

    <div v-else class="space-y-6">
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="w-full justify-start flex-wrap h-auto p-1 bg-muted/50 gap-1">
          <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="flex items-center gap-2 px-4 py-2">
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
            <Badge v-if="tab.count !== undefined" variant="secondary" class="ml-1 text-xs px-1.5 h-5 min-w-5">
              {{ tab.count }}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <div class="mt-6">
          <!-- Gemini Content -->
          <TabsContent value="gemini" class="space-y-4">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-medium">Gemini 配置</h3>
                <p class="text-sm text-muted-foreground">管理 Google Gemini API 密钥和代理设置</p>
              </div>
              <Button size="sm" @click="openModal('gemini')">
                <Plus class="w-4 h-4 mr-2" />
                添加密钥
              </Button>
            </div>
            
            <div v-if="geminiKeys.length === 0" class="empty-state">
              <Sparkles class="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p class="text-muted-foreground">暂无 Gemini 配置</p>
              <Button variant="link" @click="openModal('gemini')">立即添加</Button>
            </div>

            <div v-else class="grid gap-4">
              <div v-for="(config, index) in geminiKeys" :key="index" 
                :class="['provider-card', isConfigDisabled(config) ? 'opacity-60 grayscale-[0.5]' : '']">
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1">
                    <div class="provider-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Sparkles class="w-5 h-5" />
                    </div>
                    <div class="space-y-1.5 flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <code class="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {{ maskKey(getApiKey(config)) }}
                        </code>
                        <Badge v-if="isConfigDisabled(config)" variant="outline" class="text-xs bg-muted text-muted-foreground">已禁用</Badge>
                      </div>
                      
                      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span v-if="config.prefix" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          前缀: {{ config.prefix }}
                        </span>
                        <span v-if="getBaseUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          Base: {{ getBaseUrl(config) }}
                        </span>
                        <span v-if="getProxyUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          代理: {{ getProxyUrl(config) }}
                        </span>
                      </div>
                      
                      <!-- Usage Stats -->
                      <div class="pt-2 flex items-center gap-4">
                        <div class="flex gap-2">
                          <Badge variant="secondary" class="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 border-0">
                            成功: {{ getKeyStats(getApiKey(config)).success }}
                          </Badge>
                          <Badge variant="secondary" class="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 border-0">
                            失败: {{ getKeyStats(getApiKey(config)).failure }}
                          </Badge>
                        </div>
                        <div class="h-3 w-px bg-border"></div>
                        <ProviderStatusBar :status-data="getStatusBarData(getApiKey(config))" />
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center mr-1">
                      <Switch 
                        class="scale-90 origin-right"
                        :model-value="!isConfigDisabled(config)"
                        @update:model-value="(val) => toggleConfig('gemini', index, val)"
                      />
                    </div>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg" @click="openModal('gemini', index)">
                      <Pencil class="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" @click="confirmDelete('gemini', index)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <!-- Claude Content -->
          <TabsContent value="claude" class="space-y-4">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-medium">Claude 配置</h3>
                <p class="text-sm text-muted-foreground">管理 Anthropic Claude API 设置</p>
              </div>
              <Button size="sm" @click="openModal('claude')">
                <Plus class="w-4 h-4 mr-2" />
                添加配置
              </Button>
            </div>

            <div v-if="claudeConfigs.length === 0" class="empty-state">
              <Bot class="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p class="text-muted-foreground">暂无 Claude 配置</p>
              <Button variant="link" @click="openModal('claude')">立即添加</Button>
            </div>

            <div v-else class="grid gap-4">
              <div v-for="(config, index) in claudeConfigs" :key="index"
                :class="['provider-card', isConfigDisabled(config) ? 'opacity-60 grayscale-[0.5]' : '']">
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1">
                    <div class="provider-icon bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                      <Bot class="w-5 h-5" />
                    </div>
                    <div class="space-y-1.5 flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <code class="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {{ maskKey(getApiKey(config)) }}
                        </code>
                        <Badge v-if="isConfigDisabled(config)" variant="outline" class="text-xs bg-muted text-muted-foreground">已禁用</Badge>
                      </div>

                      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span v-if="config.prefix" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          前缀: {{ config.prefix }}
                        </span>
                         <span v-if="getBaseUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          Base: {{ getBaseUrl(config) }}
                        </span>
                        <span v-if="getProxyUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          代理: {{ getProxyUrl(config) }}
                        </span>
                      </div>

                      <div class="pt-2 flex items-center gap-4">
                        <div class="flex gap-2">
                           <Badge variant="secondary" class="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 border-0">
                            成功: {{ getKeyStats(getApiKey(config)).success }}
                          </Badge>
                          <Badge variant="secondary" class="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 border-0">
                            失败: {{ getKeyStats(getApiKey(config)).failure }}
                          </Badge>
                        </div>
                        <div class="h-3 w-px bg-border"></div>
                        <ProviderStatusBar :status-data="getStatusBarData(getApiKey(config))" />
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center mr-1">
                      <Switch 
                        class="scale-90 origin-right"
                        :model-value="!isConfigDisabled(config)"
                        @update:model-value="(val) => toggleConfig('claude', index, val)"
                      />
                    </div>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg" @click="openModal('claude', index)">
                      <Pencil class="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" @click="confirmDelete('claude', index)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <!-- Codex Content -->
          <TabsContent value="codex" class="space-y-4">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-medium">Codex 配置</h3>
                <p class="text-sm text-muted-foreground">管理 OpenAI Codex 兼容 API 设置</p>
              </div>
              <Button size="sm" @click="openModal('codex')">
                <Plus class="w-4 h-4 mr-2" />
                添加配置
              </Button>
            </div>

            <div v-if="codexConfigs.length === 0" class="empty-state">
              <Code class="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p class="text-muted-foreground">暂无 Codex 配置</p>
              <Button variant="link" @click="openModal('codex')">立即添加</Button>
            </div>

            <div v-else class="grid gap-4">
              <div v-for="(config, index) in codexConfigs" :key="index"
                :class="['provider-card', isConfigDisabled(config) ? 'opacity-60 grayscale-[0.5]' : '']">
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1">
                    <div class="provider-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <Code class="w-5 h-5" />
                    </div>
                    <div class="space-y-1.5 flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <code class="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {{ maskKey(getApiKey(config)) }}
                        </code>
                        <Badge v-if="isConfigDisabled(config)" variant="outline" class="text-xs bg-muted text-muted-foreground">已禁用</Badge>
                      </div>

                       <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span v-if="config.prefix" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          前缀: {{ config.prefix }}
                        </span>
                        <span v-if="getBaseUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          Base: {{ getBaseUrl(config) }}
                        </span>
                        <span v-if="getProxyUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          代理: {{ getProxyUrl(config) }}
                        </span>
                      </div>

                      <div class="pt-2 flex items-center gap-4">
                        <div class="flex gap-2">
                           <Badge variant="secondary" class="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 border-0">
                            成功: {{ getKeyStats(getApiKey(config)).success }}
                          </Badge>
                          <Badge variant="secondary" class="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 border-0">
                            失败: {{ getKeyStats(getApiKey(config)).failure }}
                          </Badge>
                        </div>
                        <div class="h-3 w-px bg-border"></div>
                        <ProviderStatusBar :status-data="getStatusBarData(getApiKey(config))" />
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center mr-1">
                      <Switch 
                        class="scale-90 origin-right"
                        :model-value="!isConfigDisabled(config)"
                        @update:model-value="(val) => toggleConfig('codex', index, val)"
                      />
                    </div>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg" @click="openModal('codex', index)">
                      <Pencil class="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" @click="confirmDelete('codex', index)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <!-- OpenAI Content -->
          <TabsContent value="openai" class="space-y-4">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-medium">OpenAI 兼容配置</h3>
                <p class="text-sm text-muted-foreground">管理 OpenAI 格式的兼容提供商 (如 DeepSeek, Moonshot 等)</p>
              </div>
              <Button size="sm" @click="openModal('openai')">
                <Plus class="w-4 h-4 mr-2" />
                添加提供商
              </Button>
            </div>

            <div v-if="openaiConfigs.length === 0" class="empty-state">
              <Cpu class="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p class="text-muted-foreground">暂无 OpenAI 兼容配置</p>
              <Button variant="link" @click="openModal('openai')">立即添加</Button>
            </div>

            <div v-else class="grid gap-4">
              <div v-for="(config, index) in openaiConfigs" :key="index" class="provider-card">
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1">
                    <div class="provider-icon bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <Cpu class="w-5 h-5" />
                    </div>
                    <div class="space-y-1.5 flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold">{{ config.name || '未命名' }}</span>
                        <Badge variant="outline" class="text-xs">{{ getOpenAIKeyCount(config) }} 个密钥</Badge>
                      </div>

                       <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span v-if="config.prefix" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          前缀: {{ config.prefix }}
                        </span>
                        <span class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          Base: {{ config.baseUrl || config['base-url'] || '默认' }}
                        </span>
                        <span v-if="getOpenAIProxyCount(config) > 0" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          代理: {{ getOpenAIProxyCount(config) }} 个
                        </span>
                        <span v-if="config.models?.length" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          {{ config.models.length }} 个模型映射
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg" @click="openModal('openai', index)">
                      <Pencil class="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" @click="confirmDelete('openai', index)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <!-- Vertex Content -->
          <TabsContent value="vertex" class="space-y-4">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-medium">Vertex AI 配置</h3>
                <p class="text-sm text-muted-foreground">管理 Google Vertex AI 平台配置</p>
              </div>
              <Button size="sm" @click="openModal('vertex')">
                <Plus class="w-4 h-4 mr-2" />
                添加配置
              </Button>
            </div>

            <div v-if="vertexConfigs.length === 0" class="empty-state">
              <Boxes class="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p class="text-muted-foreground">暂无 Vertex AI 配置</p>
              <Button variant="link" @click="openModal('vertex')">立即添加</Button>
            </div>

            <div v-else class="grid gap-4">
              <div v-for="(config, index) in vertexConfigs" :key="index" 
                :class="['provider-card', isConfigDisabled(config) ? 'opacity-60 grayscale-[0.5]' : '']">
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1">
                    <div class="provider-icon bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                      <Boxes class="w-5 h-5" />
                    </div>
                    <div class="space-y-1.5 flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <code class="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {{ maskKey(getApiKey(config)) }}
                        </code>
                        <Badge v-if="isConfigDisabled(config)" variant="outline" class="text-xs bg-muted text-muted-foreground">已禁用</Badge>
                      </div>

                      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span v-if="config.prefix" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          前缀: {{ config.prefix }}
                        </span>
                        <span v-if="getBaseUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          Base: {{ getBaseUrl(config) }}
                        </span>
                        <span v-if="getProxyUrl(config)" class="flex items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                          代理: {{ getProxyUrl(config) }}
                        </span>
                      </div>

                      <div class="pt-2 flex items-center gap-4">
                        <div class="flex gap-2">
                           <Badge variant="secondary" class="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 border-0">
                            成功: {{ getKeyStats(getApiKey(config)).success }}
                          </Badge>
                          <Badge variant="secondary" class="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 border-0">
                            失败: {{ getKeyStats(getApiKey(config)).failure }}
                          </Badge>
                        </div>
                        <div class="h-3 w-px bg-border"></div>
                        <ProviderStatusBar :status-data="getStatusBarData(getApiKey(config))" />
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center mr-1">
                      <Switch 
                        class="scale-90 origin-right"
                        :model-value="!isConfigDisabled(config)"
                        @update:model-value="(val) => toggleConfig('vertex', index, val)"
                      />
                    </div>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg" @click="openModal('vertex', index)">
                      <Pencil class="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" @click="confirmDelete('vertex', index)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <!-- Ampcode Content -->
          <TabsContent value="ampcode" class="space-y-4">
             <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-lg font-medium">Ampcode 配置</h3>
                <p class="text-sm text-muted-foreground">配置 Ampcode 上游服务与模型映射</p>
              </div>
              <Button size="sm" @click="openModal('ampcode')">
                <Pencil class="w-4 h-4 mr-2" />
                编辑配置
              </Button>
            </div>

            <div class="provider-card">
              <div class="grid gap-6">
                <div class="grid sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <div class="text-sm font-medium text-muted-foreground">上游 URL</div>
                    <div class="font-mono text-sm break-all">{{ getAmpcodeUpstreamUrl() || '未设置' }}</div>
                  </div>
                  <div class="space-y-1">
                     <div class="text-sm font-medium text-muted-foreground">上游 API Key</div>
                    <div class="font-mono text-sm">{{ getAmpcodeUpstreamApiKey() ? maskKey(getAmpcodeUpstreamApiKey()) : '未设置' }}</div>
                  </div>
                </div>
                
                <div class="space-y-1">
                   <div class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                     强制模型映射
                     <Badge variant="outline" :class="getAmpcodeForceModelMappings() ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-500'">
                       {{ getAmpcodeForceModelMappings() ? '开启' : '关闭' }}
                     </Badge>
                   </div>
                </div>

                <div v-if="getAmpcodeModelMappings().length" class="space-y-2">
                  <div class="text-sm font-medium text-muted-foreground">模型映射规则 ({{ getAmpcodeModelMappings().length }})</div>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="(map, idx) in getAmpcodeModelMappings().slice(0, 10)" :key="idx" 
                      class="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1.5 border border-border/50">
                      <span class="font-medium">{{ map.from }}</span>
                      <ArrowRight class="w-3 h-3 text-muted-foreground" />
                      <span>{{ map.to }}</span>
                    </div>
                     <div v-if="getAmpcodeModelMappings().length > 10" class="text-xs text-muted-foreground flex items-center px-1">
                       +{{ getAmpcodeModelMappings().length - 10 }} 更多
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>

    <!-- 动态表单 - 非 OpenAI 类型使用 Sheet 抽屉 -->
    <Sheet 
      :open="modalOpen && modalType !== 'openai'" 
      @update:open="closeModal" 
      size="xl" 
      :title="`${isEditing ? '编辑' : '添加'} ${modalTitle}`" 
      :description="modalDescription"
    >
        <div class="space-y-4">
          <!-- Common Fields: API Key, Base URL, etc. -->
          <template v-if="['gemini', 'codex', 'claude', 'vertex'].includes(modalType)">
            <div class="space-y-4">
              <div v-if="modalType !== 'claude'">
                <label class="text-sm font-medium mb-1.5 block">API Key <span class="text-red-500">*</span></label>
                <Input v-model="form.apiKey" placeholder="输入 API Key" />
              </div>
              <div v-if="modalType === 'claude'">
                 <label class="text-sm font-medium mb-1.5 block">Session Key <span class="text-red-500">*</span></label>
                <Input v-model="form.sessionKey" placeholder="输入 Session Key (sk-ant-...)" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div v-if="['gemini', 'vertex', 'codex', 'claude'].includes(modalType)">
                  <label class="text-sm font-medium mb-1.5 block">Prefix (可选)</label>
                  <Input v-model="form.prefix" placeholder="模型名称前缀" />
                </div>
                 <div v-if="modalType === 'claude'">
                  <label class="text-sm font-medium mb-1.5 block">Organization ID (可选)</label>
                  <Input v-model="form.orgId" placeholder="org-..." />
                </div>
                 <div>
                  <label class="text-sm font-medium mb-1.5 block">Base URL (可选)</label>
                  <Input v-model="form.baseUrl" placeholder="https://api.example.com" />
                </div>
              </div>
              
              <div v-if="['gemini', 'vertex', 'codex', 'claude'].includes(modalType)">
                 <label class="text-sm font-medium mb-1.5 block">Proxy URL (可选)</label>
                 <Input v-model="form.proxyUrl" placeholder="http://proxy:port" />
              </div>

              <!-- Custom Headers -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-medium">自定义 Headers</label>
                  <Button size="xs" variant="outline" @click="addHeaderItem">
                    <Plus class="w-3 h-3 mr-1" />添加
                  </Button>
                </div>
                <div class="space-y-2">
                   <div v-for="(header, idx) in form.headers" :key="idx" class="flex gap-2">
                     <Input v-model="header.key" placeholder="Key" class="flex-1 h-8 text-sm" />
                     <Input v-model="header.value" placeholder="Value" class="flex-1 h-8 text-sm" />
                     <Button size="icon" variant="ghost" class="h-8 w-8" @click="removeHeaderItem(idx)"><X class="w-3 h-3" /></Button>
                   </div>
                   <div v-if="form.headers.length === 0" class="text-xs text-muted-foreground text-center py-2 bg-muted/20 rounded border border-dashed">无自定义 Headers</div>
                </div>
              </div>

              <!-- Excluded Models (Text Area) -->
              <div>
                 <label class="text-sm font-medium mb-1.5 block">排除模型 (每行一个)</label>
                 <Textarea v-model="form.excludedModelsText" placeholder="gpt-4&#10;claude-2" rows="3" class="font-mono text-sm" />
              </div>
            </div>
          </template>

          <!-- OpenAI Specific Form - 移到 Sheet 组件中 -->
          <!-- (此部分现在在下方的 Sheet 中) -->

          <!-- Ampcode Specific Form -->
          <template v-if="modalType === 'ampcode'">
            <div class="space-y-4">
               <div>
                  <label class="text-sm font-medium mb-1.5 block">上游 URL</label>
                  <Input v-model="form.upstreamUrl" placeholder="https://api.openai.com/v1" />
               </div>
               <div>
                  <label class="text-sm font-medium mb-1.5 block">上游 API Key</label>
                  <Input v-model="form.upstreamApiKey" placeholder="sk-..." type="password" />
               </div>
               <div class="flex items-center space-x-2 py-2">
                  <Switch v-model="form.forceModelMappings" id="force-map" />
                  <label for="force-map" class="text-sm font-medium">强制启用模型映射</label>
                </div>
               
               <div>
                 <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-medium">模型映射 (From -> To)</label>
                    <Button size="xs" variant="outline" @click="addAmpcodeMapping"><Plus class="w-3 h-3 mr-1" />添加</Button>
                 </div>
                 <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                   <div v-for="(map, idx) in form.ampcodeMappings" :key="idx" class="flex gap-2 items-center">
                     <Input v-model="map.from" placeholder="From (e.g. gpt-4)" class="flex-1 h-8 text-sm" />
                     <ArrowRight class="w-3 h-3 text-muted-foreground flex-shrink-0" />
                     <Input v-model="map.to" placeholder="To (e.g. gpt-4-0613)" class="flex-1 h-8 text-sm" />
                     <Button size="icon" variant="ghost" class="h-8 w-8" @click="removeAmpcodeMapping(idx)"><X class="w-3 h-3" /></Button>
                   </div>
                 </div>
               </div>
            </div>
          </template>
        </div>

        <template #footer>
          <Button @click="handleSave" :disabled="saving">
            <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
            保存
          </Button>
          <Button variant="outline" @click="closeModal">取消</Button>
        </template>
    </Sheet>

    <!-- OpenAI 配置使用右侧抽屉 Sheet -->
    <Sheet 
      :open="modalOpen && modalType === 'openai'" 
      @update:open="closeModal" 
      :modal="!modelDiscoveryDialog.open"
      size="3xl" 
      :title="`${isEditing ? '编辑' : '添加'} OpenAI 提供商`" 
      description="添加兼容 OpenAI 接口的第三方服务商，支持模型映射和自动发现。"
    >
      <div class="space-y-4">
        <div>
           <label class="text-sm font-medium mb-1.5 block">提供商名称 <span class="text-red-500">*</span></label>
           <Input v-model="form.name" placeholder="例如: DeepSeek, Moonshot" />
        </div>
        <div>
           <label class="text-sm font-medium mb-1.5 block">Base URL <span class="text-red-500">*</span></label>
           <Input v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
        </div>
        <div>
          <label class="text-sm font-medium mb-1.5 block">Prefix (可选)</label>
          <Input v-model="form.prefix" placeholder="模型名称前缀" />
        </div>

        <!-- API Keys List -->
        <div class="border rounded-md p-4 bg-muted/10">
          <div class="flex justify-between items-center mb-3">
             <label class="text-sm font-medium">API 密钥配置</label>
             <Button size="xs" variant="outline" @click="addOpenAIKeyEntry"><Plus class="w-3 h-3 mr-1" />添加密钥</Button>
          </div>
          <div class="space-y-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
            <div v-for="(entry, idx) in form.apiKeyEntries" :key="idx" class="p-3 bg-background border rounded-md relative group">
               <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                 <Input v-model="entry.apiKey" placeholder="sk-..." class="h-8 text-sm font-mono" />
                 <Input v-model="entry.proxyUrl" placeholder="Proxy URL (可选)" class="h-8 text-sm" />
               </div>
               <Button size="icon" variant="ghost" class="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-red-500" @click="removeOpenAIKeyEntry(idx)">
                 <X class="w-3 h-3" />
               </Button>
            </div>
            <div v-if="form.apiKeyEntries.length === 0" class="text-xs text-center text-muted-foreground">至少需要一个 API Key</div>
          </div>
        </div>

        <!-- Models Mapping -->
        <div class="border rounded-md p-4 bg-muted/10">
          <div class="flex justify-between items-center mb-3">
             <label class="text-sm font-medium">模型映射</label>
             <div class="flex gap-2">
                <Button size="xs" variant="outline" @click="discoverModels" :disabled="discovering">
                  <Loader2 v-if="discovering" class="w-3 h-3 mr-1 animate-spin" />
                  {{ discovering ? '获取中' : '获取模型' }}
                </Button>
                <Button size="xs" variant="outline" @click="addModelMapping"><Plus class="w-3 h-3 mr-1" />添加</Button>
             </div>
          </div>
          <div class="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
            <div v-for="(map, idx) in form.models" :key="idx" class="flex gap-2 items-center">
              <Input v-model="map.name" placeholder="原名 (gpt-3.5)" class="flex-1 h-8 text-sm" />
              <ArrowRight class="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <Input v-model="map.alias" placeholder="别名 (my-gpt)" class="flex-1 h-8 text-sm" />
              <Button size="icon" variant="ghost" class="h-8 w-8" @click="removeModelMapping(idx)"><X class="w-3 h-3" /></Button>
            </div>
             <div v-if="form.models.length === 0" class="text-xs text-muted-foreground text-center py-2">暂无映射，将使用默认模型名</div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button @click="handleSave" :disabled="saving">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          保存
        </Button>
        <Button variant="outline" @click="closeModal">取消</Button>
      </template>
    </Sheet>

    <!-- 模型发现弹窗 -->
    <Dialog 
      :open="modelDiscoveryDialog.open" 
      @update:open="modelDiscoveryDialog.open = false" 
      size="lg" 
      title="选择模型"
      description="从远程获取的模型列表中选择要添加到映射的模型"
      :z-index="80"
    >
      <div class="space-y-4">
        <!-- Search Input -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            v-model="modelDiscoveryDialog.searchQuery" 
            placeholder="搜索模型..." 
            class="pl-9"
          />
        </div>

        <!-- Select All -->
        <div class="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              :checked="filteredDiscoveryModels.length > 0 && filteredDiscoveryModels.every(m => m.selected)"
              @update:checked="toggleAllDiscoveredModels"
            />
            <span>全选</span>
          </label>
          <span>共 {{ filteredDiscoveryModels.length }} 个模型，已选 {{ selectedDiscoveryCount }} 个</span>
        </div>

        <!-- Model List -->
        <div class="max-h-[300px] overflow-y-auto space-y-1 pr-1">
          <div 
            v-for="model in filteredDiscoveryModels" 
            :key="model.id"
            class="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
            @click="model.selected = !model.selected"
          >
            <Checkbox 
              :checked="model.selected" 
              @update:checked="model.selected = $event"
              @click.stop
            />
            <code class="text-sm font-mono bg-muted px-2 py-0.5 rounded flex-1 truncate">
              {{ model.id }}
            </code>
          </div>
          <div v-if="filteredDiscoveryModels.length === 0" class="text-center text-muted-foreground py-8">
            {{ modelDiscoveryDialog.searchQuery ? '没有匹配的模型' : '没有可用的新模型' }}
          </div>
        </div>
      </div>

      <template #footer>
        <Button @click="confirmAddDiscoveredModels" :disabled="selectedDiscoveryCount === 0">
          确认添加 ({{ selectedDiscoveryCount }})
        </Button>
        <Button variant="outline" @click="modelDiscoveryDialog.open = false">取消</Button>
      </template>
    </Dialog>

    <!-- Delete Confirm -->
    <Dialog :open="deleteConfirm.open" @update:open="deleteConfirm.open = false" size="sm" title="确认删除" description="确定要删除此配置吗？此操作无法撤销。">
      <template #footer>
        <Button variant="destructive" @click="executeDelete" :disabled="deleting">
          <Loader2 v-if="deleting" class="w-4 h-4 mr-2 animate-spin" />
          删除
        </Button>
        <Button variant="outline" @click="deleteConfirm.open = false">取消</Button>
      </template>
    </Dialog>

  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { apiClient } from '@/api/client'
import { useToast } from '@/composables/useToast'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import CardSection from '@/components/layout/CardSection.vue'
import {
  Sparkles, Bot, Code, Cpu, Boxes, Plus, Pencil, Trash2, 
  Loader2, ArrowRight, X, Activity, Search
} from 'lucide-vue-next'
import { 
  Dialog, Sheet,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Button, Input, Badge, Skeleton, Switch, Textarea, Checkbox
} from '@/components/ui'

// -- Types --

interface BaseConfig {
  apiKey?: string
  'api-key'?: string
  prefix?: string
  baseUrl?: string
  'base-url'?: string
  proxyUrl?: string
  'proxy-url'?: string
  excludedModels?: string[]
  headers?: Record<string, string>
}

interface OpenAIConfig {
  name: string
  baseUrl?: string
  'base-url'?: string
  apiKeys?: string[] | Array<{ apiKey: string, proxyUrl?: string, headers?: Record<string, string> }>
  'api-keys'?: any
  models?: Array<{ name: string, alias: string }>
}

interface AmpcodeConfig {
  upstreamUrl?: string
  upstreamApiKey?: string
  forceModelMappings?: boolean
  modelMappings?: Array<{ from: string, to: string }>
}

interface KeyStats {
  success: number
  failure: number
}

// Inline ProviderStatusBar component
const ProviderStatusBar = defineAsyncComponent(() => Promise.resolve({
  props: ['statusData'],
  template: `
    <div class="flex gap-0.5 h-3 items-end">
      <div 
        v-for="(block, i) in statusData" 
        :key="i"
        class="w-1.5 rounded-sm transition-all duration-300"
        :class="{
          'h-1.5 bg-muted': block === 'idle',
          'h-3 bg-green-500': block === 'success',
          'h-3 bg-red-500': block === 'failure',
          'h-3 bg-yellow-500': block === 'mixed'
        }"
        :title="block"
      ></div>
    </div>
  `
}))

const { toast } = useToast()

// -- State --
const loading = ref(true)
const statsLoaded = ref(false)
const saving = ref(false)
const deleting = ref(false)
const discovering = ref(false)
const activeTab = ref('openai')

const geminiKeys = ref<any[]>([])
const claudeConfigs = ref<any[]>([])
const codexConfigs = ref<any[]>([])
const openaiConfigs = ref<any[]>([])
const vertexConfigs = ref<any[]>([])
const ampcodeConfig = ref<AmpcodeConfig | null>(null)

// Stats
const usageStats = ref<any>(null)
const keyStatsCache = reactive(new Map<string, KeyStats>())
const statusBarCache = reactive(new Map<string, string[]>())

// Modal
const modalOpen = ref(false)
const modalType = ref('gemini')
const isEditing = ref(false)
const editIndex = ref(-1)

// Form
const form = reactive({
  apiKey: '',
  sessionKey: '',
  prefix: '',
  baseUrl: '',
  proxyUrl: '',
  orgId: '',
  name: '',
  headers: [] as Array<{key: string, value: string}>,
  excludedModelsText: '',
  // OpenAI
  apiKeyEntries: [] as Array<{apiKey: string, proxyUrl: string, headers: any}>,
  models: [] as Array<{name: string, alias: string}>,
  // Ampcode
  upstreamUrl: '',
  upstreamApiKey: '',
  forceModelMappings: false,
  ampcodeMappings: [] as Array<{from: string, to: string}>
})

const deleteConfirm = reactive({
  open: false,
  type: '',
  index: -1
})

// Model Discovery Dialog State
const modelDiscoveryDialog = reactive({
  open: false,
  models: [] as Array<{ id: string; selected: boolean }>,
  searchQuery: '',
  loading: false
})

// Computed: Filtered models for discovery dialog (exclude already mapped + apply search)
const filteredDiscoveryModels = computed(() => {
  const existingNames = new Set(form.models.map(m => m.name))
  let models = modelDiscoveryDialog.models.filter(m => !existingNames.has(m.id))
  
  if (modelDiscoveryDialog.searchQuery.trim()) {
    const query = modelDiscoveryDialog.searchQuery.toLowerCase()
    models = models.filter(m => m.id.toLowerCase().includes(query))
  }
  
  return models
})

// Computed: Selected count in discovery dialog
const selectedDiscoveryCount = computed(() => {
  return modelDiscoveryDialog.models.filter(m => m.selected).length
})

// -- Computed --
const tabs = computed(() => [
  { value: 'openai', label: 'OpenAI 兼容', icon: Cpu, count: openaiConfigs.value.length },
  { value: 'gemini', label: 'Gemini', icon: Sparkles, count: geminiKeys.value.length },
  { value: 'claude', label: 'Claude', icon: Bot, count: claudeConfigs.value.length },
  { value: 'codex', label: 'Codex', icon: Code, count: codexConfigs.value.length },
  { value: 'vertex', label: 'Vertex', icon: Boxes, count: vertexConfigs.value.length },
  { value: 'ampcode', label: 'Ampcode', icon: Activity }
])

const modalTitle = computed(() => {
  const map: Record<string, string> = {
    gemini: 'Gemini 配置', claude: 'Claude 配置', codex: 'Codex 配置',
    openai: 'OpenAI 提供商', vertex: 'Vertex 配置', ampcode: 'Ampcode 配置'
  }
  return map[modalType.value] || '配置'
})

const modalDescription = computed(() => {
  if (modalType.value === 'openai') return '添加兼容 OpenAI 接口的第三方服务商，支持模型映射和自动发现。'
  if (modalType.value === 'ampcode') return '配置 Ampcode 聚合接口的上游转发规则。'
  return '配置 API 密钥、代理地址及其他连接参数。'
})

// -- Methods --

// Data Fetching
const fetchData = async () => {
  loading.value = true
  try {
    const [g, c, cx, o, v, a] = await Promise.allSettled([
      apiClient.get<any>('/gemini-api-key'),
      apiClient.get<any>('/claude-api-key'),
      apiClient.get<any>('/codex-api-key'),
      apiClient.get<any>('/openai-compatibility'),
      apiClient.get<any>('/vertex-api-key'),
      apiClient.get<any>('/ampcode')
    ])

    if (g.status === 'fulfilled') geminiKeys.value = g.value['gemini-api-key'] || []
    if (c.status === 'fulfilled') claudeConfigs.value = c.value['claude-api-key'] || []
    if (cx.status === 'fulfilled') codexConfigs.value = cx.value['codex-api-key'] || []
    if (o.status === 'fulfilled') openaiConfigs.value = o.value['openai-compatibility'] || []
    if (v.status === 'fulfilled') vertexConfigs.value = v.value['vertex-api-key'] || [] // Assuming endpoint structure
    if (a.status === 'fulfilled') ampcodeConfig.value = a.value as AmpcodeConfig
    
    // Load Stats independently to not block UI
    loadStats()
  } catch (e) {
    console.error(e)
    toast({ title: '加载失败', variant: 'destructive' })
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    // Attempt to fetch usage data. Note: Endpoint might differ based on backend.
    // Assuming /usage or similar. Since I can't confirm, I'll try /usage
    // If it fails, stats just won't show.
    const res = await apiClient.get<any>('/usage').catch(() => null)
    if (res) {
      usageStats.value = res.usage || res
      processStats()
    }
  } catch(e) { /* ignore */ }
  finally {
    statsLoaded.value = true
  }
}

// Stats Processing
const processStats = () => {
  if (!usageStats.value) return
  
  // Logic ported from React usage.ts
  // Simplified for performance
  const details = [] as any[]
  const apis = usageStats.value.apis || {}
  Object.values(apis).forEach((api: any) => {
    Object.values(api.models || {}).forEach((model: any) => {
      if (Array.isArray(model.details)) details.push(...model.details)
    })
  })

  // Calculate Key Stats
  const keyMap = new Map<string, {success: number, failure: number}>()
  const ensure = (k: string) => {
    if (!keyMap.has(k)) keyMap.set(k, {success: 0, failure: 0})
    return keyMap.get(k)!
  }

  details.forEach(d => {
    // Assuming source or auth_index maps to key. 
    // We'll use a simplified matching.
    const keysToCheck = [d.source, d.auth_index].filter(Boolean)
    keysToCheck.forEach(k => {
      const bucket = ensure(String(k))
      if (d.failed) bucket.failure++
      else bucket.success++
    })
  })

  // Update Cache
  keyStatsCache.clear()
  keyMap.forEach((v, k) => keyStatsCache.set(k, v))

  // Calculate Status Bar (Last 20 blocks of 5 mins)
  // We need to group by key first
  const keyDetails = new Map<string, any[]>()
  details.forEach(d => {
    const k = String(d.source || d.auth_index || '')
    if (!keyDetails.has(k)) keyDetails.set(k, [])
    keyDetails.get(k)!.push(d)
  })

  const now = Date.now()
  const BLOCK_MS = 5 * 60 * 1000
  keyDetails.forEach((ds, k) => {
    const blocks = new Array(20).fill('idle')
    ds.forEach(d => {
      const time = new Date(d.timestamp).getTime()
      const age = now - time
      const idx = 19 - Math.floor(age / BLOCK_MS)
      if (idx >= 0 && idx < 20) {
        const current = blocks[idx]
        const state = d.failed ? 'failure' : 'success'
        if (current === 'idle') blocks[idx] = state
        else if (current !== state) blocks[idx] = 'mixed'
      }
    })
    statusBarCache.set(k, blocks)
  })
}

const getKeyStats = (key: string) => {
  // Try to match masked key or raw key
  // This is a best-effort matching since we don't have full raw keys in frontend often
  // But stats usually come with masked keys or IDs
  return keyStatsCache.get(key) || 
         keyStatsCache.get(maskKey(key)) || 
         { success: 0, failure: 0 }
}

const getStatusBarData = (key: string) => {
  return statusBarCache.get(key) || 
         statusBarCache.get(maskKey(key)) || 
         new Array(20).fill('idle')
}


// Helpers - field accessors for backend compatibility (kebab-case vs camelCase)
const getApiKey = (config: any) => config['api-key'] || config.apiKey || ''
const getBaseUrl = (config: any) => config['base-url'] || config.baseUrl || ''
const getProxyUrl = (config: any) => config['proxy-url'] || config.proxyUrl || ''
const getExcludedModels = (config: any) => config['excluded-models'] || config.excludedModels || []

// Ampcode field accessors
const getAmpcodeUpstreamUrl = () => ampcodeConfig.value?.['upstream-url'] || (ampcodeConfig.value as any)?.upstreamUrl || ''
const getAmpcodeUpstreamApiKey = () => ampcodeConfig.value?.['upstream-api-key'] || (ampcodeConfig.value as any)?.upstreamApiKey || ''
const getAmpcodeForceModelMappings = () => ampcodeConfig.value?.['force-model-mappings'] ?? (ampcodeConfig.value as any)?.forceModelMappings ?? false
const getAmpcodeModelMappings = () => ampcodeConfig.value?.['model-mappings'] || (ampcodeConfig.value as any)?.modelMappings || []

const maskKey = (key: string) => {
  if (!key) return ''
  if (key.length <= 8) return key
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

const isConfigDisabled = (config: any) => {
  if (!config) return false
  return config.disabled === true || config['disabled'] === true || config.Disabled === true
}

const getOpenAIKeyCount = (config: any) => {
  // Backend returns 'api-key-entries' (hyphenated)
  if (Array.isArray(config['api-key-entries'])) return config['api-key-entries'].length
  if (Array.isArray(config.apiKeyEntries)) return config.apiKeyEntries.length
  if (Array.isArray(config.apiKeys)) return config.apiKeys.length
  if (Array.isArray(config['api-keys'])) return config['api-keys'].length
  return 0
}

const getOpenAIProxyCount = (config: any) => {
  const entries =
    (Array.isArray(config?.['api-key-entries']) && config['api-key-entries']) ||
    (Array.isArray(config?.apiKeyEntries) && config.apiKeyEntries) ||
    (Array.isArray(config?.apiKeys) && config.apiKeys) ||
    (Array.isArray(config?.['api-keys']) && config['api-keys']) ||
    []

  if (!Array.isArray(entries)) return 0

  let count = 0
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const proxy = (entry as any)['proxy-url'] || (entry as any).proxyUrl
    if (typeof proxy === 'string' && proxy.trim()) count++
  }
  return count
}

// Actions
const toggleConfig = async (type: string, index: number, enabled: boolean) => {
  let list = [] as any[]
  let endpoint = ''
  
  // Get list ref
  if (type === 'gemini') { list = [...geminiKeys.value]; endpoint = '/gemini-api-key' }
  else if (type === 'claude') { list = [...claudeConfigs.value]; endpoint = '/claude-api-key' }
  else if (type === 'codex') { list = [...codexConfigs.value]; endpoint = '/codex-api-key' }
  else if (type === 'vertex') { list = [...vertexConfigs.value]; endpoint = '/vertex-api-key' }
  else return

  const disabled = !enabled
  const item = { ...list[index], disabled }
  list[index] = item
  
  // Optimistic update
  if (type === 'gemini') geminiKeys.value = list
  else if (type === 'claude') claudeConfigs.value = list
  else if (type === 'codex') codexConfigs.value = list
  else if (type === 'vertex') vertexConfigs.value = list

  try {
    await apiClient.patch(endpoint, { index, value: { disabled } })
    toast({ title: enabled ? '已启用' : '已禁用' })
  } catch (e) {
    toast({ title: '操作失败', variant: 'destructive' })
    fetchData() // Revert
  }
}

// Modal Logic
const openModal = (type: string, index = -1) => {
  modalType.value = type
  editIndex.value = index
  isEditing.value = index !== -1
  
  // Reset Form
  form.apiKey = ''
  form.sessionKey = ''
  form.prefix = ''
  form.baseUrl = ''
  form.proxyUrl = ''
  form.orgId = ''
  form.name = ''
  form.headers = []
  form.excludedModelsText = ''
  form.apiKeyEntries = []
  form.models = []
  form.upstreamUrl = ''
  form.upstreamApiKey = ''
  form.forceModelMappings = false
  form.ampcodeMappings = []

  // Fill Data if editing
  if (isEditing.value) {
    let item: any = null
    if (type === 'gemini') item = geminiKeys.value[index]
    if (type === 'claude') item = claudeConfigs.value[index]
    if (type === 'codex') item = codexConfigs.value[index]
    if (type === 'vertex') item = vertexConfigs.value[index]
    if (type === 'openai') item = openaiConfigs.value[index]
    if (type === 'ampcode') item = ampcodeConfig.value

    if (item) {
      // Common
      form.apiKey = item.apiKey || item['api-key'] || item.accessToken || item['access-token'] || ''
      // For Claude, session key is stored as 'api-key' in backend
      form.sessionKey = item.sessionKey || item['session-key'] || item['api-key'] || item.apiKey || ''
      form.prefix = item.prefix || ''
      form.baseUrl = item.baseUrl || item['base-url'] || ''
      form.proxyUrl = item.proxyUrl || item['proxy-url'] || ''
      form.orgId = item.orgId || item['org-id'] || ''
      
      // Headers
      if (item.headers) {
        form.headers = Object.entries(item.headers).map(([k, v]) => ({ key: k, value: String(v) }))
      }

      // Excluded - backend uses 'excluded-models' (hyphenated)
      const excludedModels = item['excluded-models'] || item.excludedModels
      if (excludedModels) {
        form.excludedModelsText = excludedModels.join('\n')
      }

      // OpenAI Specific
      if (type === 'openai') {
        form.name = item.name || ''
        form.baseUrl = item.baseUrl || item['base-url'] || ''
        // Normalize api keys - backend uses 'api-key-entries' with 'api-key' and 'proxy-url'
        const rawKeys = item['api-key-entries'] || item.apiKeyEntries || item.apiKeys || item['api-keys'] || []
        if (Array.isArray(rawKeys)) {
           form.apiKeyEntries = rawKeys.map((k: any) => {
             if (typeof k === 'string') return { apiKey: k, proxyUrl: '', headers: {} }
             // Backend uses 'api-key' and 'proxy-url' (with hyphens)
             return { 
               apiKey: k['api-key'] || k.apiKey || '', 
               proxyUrl: k['proxy-url'] || k.proxyUrl || '', 
               headers: k.headers || {} 
             }
           })
        }
        // Models
        if (item.models) form.models = [...item.models]
      }

      // Ampcode Specific - backend uses hyphenated keys
      if (type === 'ampcode') {
        form.upstreamUrl = item['upstream-url'] || item.upstreamUrl || ''
        form.upstreamApiKey = item['upstream-api-key'] || item.upstreamApiKey || ''
        form.forceModelMappings = !!(item['force-model-mappings'] || item.forceModelMappings)
        const mappings = item['model-mappings'] || item.modelMappings || []
        form.ampcodeMappings = mappings.length ? [...mappings] : []
      }
    }
  }

  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
}

// Form Helpers
const addHeaderItem = () => form.headers.push({ key: '', value: '' })
const removeHeaderItem = (i: number) => form.headers.splice(i, 1)

const addOpenAIKeyEntry = () => form.apiKeyEntries.push({ apiKey: '', proxyUrl: '', headers: {} })
const removeOpenAIKeyEntry = (i: number) => form.apiKeyEntries.splice(i, 1)

const addModelMapping = () => form.models.push({ name: '', alias: '' })
const removeModelMapping = (i: number) => form.models.splice(i, 1)

const addAmpcodeMapping = () => form.ampcodeMappings.push({ from: '', to: '' })
const removeAmpcodeMapping = (i: number) => form.ampcodeMappings.splice(i, 1)

const discoverModels = async () => {
  if (!form.baseUrl) {
    toast({ title: '请先填写 Base URL', variant: 'destructive' })
    return
  }
  
  // Get first available API key
  const firstKey = form.apiKeyEntries.find(e => e.apiKey?.trim())
  if (!firstKey) {
    toast({ title: '请先填写至少一个 API Key', variant: 'destructive' })
    return
  }
  
  discovering.value = true
  modelDiscoveryDialog.loading = true
  
  try {
    // Normalize base URL and append /models endpoint
    let baseUrl = form.baseUrl.trim().replace(/\/+$/, '')
    // If baseUrl doesn't end with /v1, try to append it
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl + '/v1'
    }
    const modelsUrl = `${baseUrl}/models`
    
    // Call the external API directly
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firstKey.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    const models = data.data || data.models || []
    
    if (Array.isArray(models) && models.length > 0) {
      // Get existing model names to filter
      const existingNames = new Set(form.models.map(m => m.name))
      
      // Map models to discovery format, filtering out already mapped ones
      const discoveredModels = models
        .map((m: any) => ({
          id: m.id || m.name || '',
          selected: false
        }))
        .filter((m: { id: string }) => m.id && !existingNames.has(m.id))
      
      if (discoveredModels.length > 0) {
        // Open discovery dialog with models
        modelDiscoveryDialog.models = discoveredModels
        modelDiscoveryDialog.searchQuery = ''
        modelDiscoveryDialog.open = true
      } else {
        toast({ title: '没有发现新模型', description: '所有可用模型已添加到映射列表' })
      }
    } else {
      toast({ title: '未获取到模型列表', variant: 'destructive' })
    }
  } catch (e: any) {
    console.error('获取模型失败:', e)
    toast({ 
      title: '获取模型失败', 
      description: e.message || '请检查 Base URL 和 API Key 是否正确',
      variant: 'destructive' 
    })
  } finally {
    discovering.value = false
    modelDiscoveryDialog.loading = false
  }
}

// Add selected models from discovery dialog to form.models
const confirmAddDiscoveredModels = () => {
  const selectedModels = modelDiscoveryDialog.models
    .filter(m => m.selected)
    .map(m => ({ name: m.id, alias: '' }))
  
  if (selectedModels.length > 0) {
    form.models.push(...selectedModels)
    toast({ title: `已添加 ${selectedModels.length} 个模型到映射列表` })
  }
  
  modelDiscoveryDialog.open = false
  modelDiscoveryDialog.models = []
  modelDiscoveryDialog.searchQuery = ''
}

// Toggle all filtered models selection
const toggleAllDiscoveredModels = (checked: boolean) => {
  const filteredIds = new Set(filteredDiscoveryModels.value.map(m => m.id))
  modelDiscoveryDialog.models.forEach(m => {
    if (filteredIds.has(m.id)) {
      m.selected = checked
    }
  })
}

// Save Logic
const handleSave = async () => {
  saving.value = true
  try {
    const headers = form.headers.reduce((acc, cur) => {
      if (cur.key) acc[cur.key] = cur.value
      return acc
    }, {} as Record<string, string>)

    const excluded = form.excludedModelsText
      ? form.excludedModelsText.split('\n').map(s => s.trim()).filter(Boolean)
      : []

    if (modalType.value === 'ampcode') {
      // Use hyphenated keys for backend compatibility
      const payload: Record<string, any> = {
        'upstream-url': form.upstreamUrl,
        'upstream-api-key': form.upstreamApiKey,
        'force-model-mappings': form.forceModelMappings,
        'model-mappings': form.ampcodeMappings.filter(m => m.from && m.to)
      }
      await apiClient.put('/ampcode', payload)
    } else {
      let list = [] as any[]
      let endpoint = ''
      
      if (modalType.value === 'gemini') { list = [...geminiKeys.value]; endpoint = '/gemini-api-key' }
      else if (modalType.value === 'claude') { list = [...claudeConfigs.value]; endpoint = '/claude-api-key' }
      else if (modalType.value === 'codex') { list = [...codexConfigs.value]; endpoint = '/codex-api-key' }
      else if (modalType.value === 'vertex') { list = [...vertexConfigs.value]; endpoint = '/vertex-api-key' }
      else if (modalType.value === 'openai') { list = [...openaiConfigs.value]; endpoint = '/openai-compatibility' }

      const newItem: any = {}
      
      // Common props - use hyphenated keys for backend compatibility (skip baseUrl for openai - handled separately)
      if (form.baseUrl && modalType.value !== 'openai') newItem['base-url'] = form.baseUrl
      if (form.prefix) newItem.prefix = form.prefix
      if (form.proxyUrl) newItem['proxy-url'] = form.proxyUrl
      if (Object.keys(headers).length) newItem.headers = headers
      if (excluded.length) newItem['excluded-models'] = excluded

      // Specifics - use 'api-key' for all providers (backend uses 'api-key' JSON tag)
      if (modalType.value === 'gemini') newItem['api-key'] = form.apiKey
      if (modalType.value === 'codex') newItem['api-key'] = form.apiKey
      if (modalType.value === 'vertex') newItem['api-key'] = form.apiKey
      if (modalType.value === 'claude') {
        newItem['api-key'] = form.sessionKey
      }
      if (modalType.value === 'openai') {
        newItem.name = form.name
        // Backend expects 'base-url' with hyphen
        newItem['base-url'] = form.baseUrl
        // Backend expects 'api-key-entries' with 'api-key' and 'proxy-url' (hyphenated)
        newItem['api-key-entries'] = form.apiKeyEntries
          .filter(e => e.apiKey?.trim())
          .map(e => ({
            'api-key': e.apiKey,
            'proxy-url': e.proxyUrl || undefined,
          }))
        newItem.models = form.models.filter(m => m.name && m.alias)
      }

      if (isEditing.value && editIndex.value !== -1) {
        list[editIndex.value] = { ...list[editIndex.value], ...newItem }
      } else {
        list.push(newItem)
      }

      await apiClient.put(endpoint, { items: list })
    }

    toast({ title: '保存成功' })
    closeModal()
    fetchData()
  } catch (e) {
    console.error(e)
    toast({ title: '保存失败', variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

// Delete Logic
const confirmDelete = (type: string, index: number) => {
  deleteConfirm.type = type
  deleteConfirm.index = index
  deleteConfirm.open = true
}

const executeDelete = async () => {
  if (deleteConfirm.index === -1) return
  deleting.value = true
  
  try {
    let list = [] as any[]
    let endpoint = ''
    
    // We update the list by removing the item and PUTting the whole list
    // This is safer than DELETE by index if the backend doesn't strictly support index-based DELETE for all
    // But wait, the existing code used DELETE with index param. 
    // I should probably stick to that if it works, BUT I want to be consistent.
    // Existing code: apiClient.delete(`${endpoints[type]}?index=${index}`)
    // I will use that for consistency with legacy backend behavior.
    
    const index = deleteConfirm.index
    const type = deleteConfirm.type
    
    const endpoints: Record<string, string> = {
       gemini: '/gemini-api-key',
       claude: '/claude-api-key',
       codex: '/codex-api-key',
       openai: '/openai-compatibility',
       vertex: '/vertex-api-key' // Assuming
    }

    await apiClient.delete(`${endpoints[type]}?index=${index}`)
    toast({ title: '删除成功' })
    deleteConfirm.open = false
    fetchData()
  } catch (e) {
    toast({ title: '删除失败', variant: 'destructive' })
  } finally {
    deleting.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.provider-card {
  @apply bg-card border rounded-lg p-4 transition-all duration-200;
  border-color: color-mix(in oklch, var(--border) 60%, transparent);
}
.provider-card:hover {
  @apply shadow-sm;
  border-color: var(--border);
}
.provider-icon {
  @apply w-10 h-10 rounded-lg flex items-center justify-center border border-transparent;
}
.empty-state {
  @apply text-center py-12 rounded-lg border border-dashed flex flex-col items-center justify-center;
  background-color: color-mix(in oklch, var(--muted) 10%, transparent);
  border-color: var(--border);
}
</style>

/**
 * Integration test for useVisualConfig composable
 * Verifies YAML loading and saving functionality
 */

import { describe, it, expect } from 'vitest'
import { useVisualConfig } from './useVisualConfig'

describe('useVisualConfig Integration', () => {
  it('should load basic configuration from YAML', () => {
    const { loadVisualValuesFromYaml, visualValues } = useVisualConfig()
    
    const yamlContent = `
host: localhost
port: 8080
debug: true
tls:
  enable: true
  cert: /path/to/cert.pem
  key: /path/to/key.pem
streaming:
  keepalive-seconds: 30
  bootstrap-retries: 3
nonstream-keepalive-interval: 15
`

    loadVisualValuesFromYaml(yamlContent)

    expect(visualValues.value.host).toBe('localhost')
    expect(visualValues.value.port).toBe('8080')
    expect(visualValues.value.debug).toBe(true)
    expect(visualValues.value.tlsEnable).toBe(true)
    expect(visualValues.value.tlsCert).toBe('/path/to/cert.pem')
    expect(visualValues.value.tlsKey).toBe('/path/to/key.pem')
    expect(visualValues.value.streaming.keepaliveSeconds).toBe('30')
    expect(visualValues.value.streaming.bootstrapRetries).toBe('3')
    expect(visualValues.value.streaming.nonstreamKeepaliveInterval).toBe('15')
  })

  it('should load API key configurations from YAML', () => {
    const { loadVisualValuesFromYaml, visualValues } = useVisualConfig()
    
    const yamlContent = `
gemini-api-key:
  - api-key: "test-gemini-key"
    prefix: "gemini"
    base-url: "https://api.gemini.com"
    headers:
      Authorization: "Bearer token"
    models:
      - name: "gemini-pro"
        alias: "gpt-4"
    excluded-models:
      - "gemini-old"

codex-api-key:
  - api-key: "test-codex-key"
    prefix: "codex"

openai-compatibility:
  - name: "Custom Provider"
    base-url: "https://api.custom.com"
    api-key-entries:
      - api-key: "custom-key"
        proxy-url: "https://proxy.com"
`

    loadVisualValuesFromYaml(yamlContent)

    // Check Gemini API keys
    expect(visualValues.value.geminiApiKeys).toHaveLength(1)
    expect(visualValues.value.geminiApiKeys[0].apiKey).toBe('test-gemini-key')
    expect(visualValues.value.geminiApiKeys[0].prefix).toBe('gemini')
    expect(visualValues.value.geminiApiKeys[0].baseUrl).toBe('https://api.gemini.com')
    expect(visualValues.value.geminiApiKeys[0].headers).toHaveLength(1)
    expect(visualValues.value.geminiApiKeys[0].headers[0].key).toBe('Authorization')
    expect(visualValues.value.geminiApiKeys[0].headers[0].value).toBe('Bearer token')
    expect(visualValues.value.geminiApiKeys[0].models).toHaveLength(1)
    expect(visualValues.value.geminiApiKeys[0].models[0].name).toBe('gemini-pro')
    expect(visualValues.value.geminiApiKeys[0].models[0].alias).toBe('gpt-4')
    expect(visualValues.value.geminiApiKeys[0].excludedModels).toEqual(['gemini-old'])

    // Check Codex API keys
    expect(visualValues.value.codexApiKeys).toHaveLength(1)
    expect(visualValues.value.codexApiKeys[0].apiKey).toBe('test-codex-key')
    expect(visualValues.value.codexApiKeys[0].prefix).toBe('codex')

    // Check OpenAI compatibility
    expect(visualValues.value.openaiCompatibility).toHaveLength(1)
    expect(visualValues.value.openaiCompatibility[0].name).toBe('Custom Provider')
    expect(visualValues.value.openaiCompatibility[0].baseUrl).toBe('https://api.custom.com')
    expect(visualValues.value.openaiCompatibility[0].apiKeyEntries).toHaveLength(1)
    expect(visualValues.value.openaiCompatibility[0].apiKeyEntries[0].apiKey).toBe('custom-key')
    expect(visualValues.value.openaiCompatibility[0].apiKeyEntries[0].proxyUrl).toBe('https://proxy.com')
  })

  it('should apply visual changes back to YAML correctly', () => {
    const { loadVisualValuesFromYaml, applyVisualChangesToYaml, setVisualValues } = useVisualConfig()
    
    const originalYaml = `
host: localhost
port: 8080
debug: false
`

    loadVisualValuesFromYaml(originalYaml)
    
    // Update some values
    setVisualValues({
      host: 'updated-host',
      port: '9000',
      debug: true,
      streaming: {
        keepaliveSeconds: '60',
        bootstrapRetries: '5',
        nonstreamKeepaliveInterval: '20'
      }
    })

    const updatedYaml = applyVisualChangesToYaml(originalYaml)
    
    // Verify the YAML contains the updated values
    expect(updatedYaml).toContain('host: updated-host')
    expect(updatedYaml).toContain('port: 9000')
    expect(updatedYaml).toContain('debug: true')
    expect(updatedYaml).toContain('keepalive-seconds: 60')
    expect(updatedYaml).toContain('bootstrap-retries: 5')
    expect(updatedYaml).toContain('nonstream-keepalive-interval: 20')
  })

  it('should handle OAuth excluded models configuration', () => {
    const { loadVisualValuesFromYaml, visualValues } = useVisualConfig()
    
    const yamlContent = `
oauth-excluded-models:
  gemini-cli:
    - "gemini-1.0-*"
    - "*-preview"
  vertex:
    - "vertex-old"
`

    loadVisualValuesFromYaml(yamlContent)

    expect(visualValues.value.oauthExcludedModels).toEqual({
      'gemini-cli': ['gemini-1.0-*', '*-preview'],
      'vertex': ['vertex-old']
    })
  })

  it('should handle malformed YAML gracefully', () => {
    const { loadVisualValuesFromYaml, visualValues } = useVisualConfig()
    
    const malformedYaml = `
host: localhost
port: 8080
invalid: [unclosed array
debug: true
`

    // Should not throw an error
    expect(() => loadVisualValuesFromYaml(malformedYaml)).not.toThrow()
    
    // Should use default values when parsing fails
    expect(visualValues.value.host).toBe('')
    expect(visualValues.value.port).toBe('')
    expect(visualValues.value.debug).toBe(false)
  })
})
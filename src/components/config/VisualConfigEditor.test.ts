/**
 * Integration test for VisualConfigEditor
 * Verifies that all components are correctly integrated and configuration loading/saving works
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VisualConfigEditor from './VisualConfigEditor.vue'
import { DEFAULT_VISUAL_VALUES } from '@/types/config'
import type { VisualConfigValues } from '@/types/config'

describe('VisualConfigEditor Integration', () => {
  it('should render all configuration sections', () => {
    const wrapper = mount(VisualConfigEditor, {
      props: {
        values: DEFAULT_VISUAL_VALUES,
      },
    })

    // Check that the main container exists
    expect(wrapper.find('.visual-config-editor').exists()).toBe(true)

    // Check that all section components are rendered
    const sections = [
      'ServerConfigSection',
      'TlsConfigSection',
      'RemoteManagementSection',
      'AuthConfigSection',
      'SystemConfigSection',
      'NetworkConfigSection',
      'QuotaConfigSection',
      'StreamingConfigSection',
      'AmpcodeConfigSection',
      'OAuthModelMappingsSection',
      'OAuthExcludedModelsSection',
      'PayloadConfigSection',
    ]

    // Verify all sections are present in the component
    sections.forEach((sectionName) => {
      expect(wrapper.findComponent({ name: sectionName }).exists()).toBe(true)
    })
  })

  it('should emit update:values when section updates', async () => {
    const wrapper = mount(VisualConfigEditor, {
      props: {
        values: DEFAULT_VISUAL_VALUES,
      },
    })

    // Simulate a section update
    const serverSection = wrapper.findComponent({ name: 'ServerConfigSection' })
    const updateData = { host: 'localhost', port: '8080' }

    await serverSection.vm.$emit('update', updateData)

    // Check that the update:values event was emitted
    expect(wrapper.emitted('update:values')).toBeTruthy()
    expect(wrapper.emitted('update:values')?.[0]).toEqual([updateData])
  })

  it('should pass correct values to each section', () => {
    const testValues: VisualConfigValues = {
      ...DEFAULT_VISUAL_VALUES,
      host: 'test-host',
      port: '9000',
      debug: true,
      pprofEnable: true,
      pprofAddr: '127.0.0.1:8316',
      streaming: {
        keepaliveSeconds: '30',
        bootstrapRetries: '3',
        nonstreamKeepaliveInterval: '15',
      },
    }

    const wrapper = mount(VisualConfigEditor, {
      props: {
        values: testValues,
      },
    })

    // Check server config section receives correct values
    const serverSection = wrapper.findComponent({ name: 'ServerConfigSection' })
    expect(serverSection.props('values')).toEqual({
      host: 'test-host',
      port: '9000',
    })

    // Check system config section receives correct values
    const systemSection = wrapper.findComponent({ name: 'SystemConfigSection' })
    expect(systemSection.props('values').debug).toBe(true)
    expect(systemSection.props('values').pprofEnable).toBe(true)
    expect(systemSection.props('values').pprofAddr).toBe('127.0.0.1:8316')

    // Check streaming config section receives correct values
    const streamingSection = wrapper.findComponent({
      name: 'StreamingConfigSection',
    })
    expect(streamingSection.props('values')).toEqual({
      streaming: {
        keepaliveSeconds: '30',
        bootstrapRetries: '3',
        nonstreamKeepaliveInterval: '15',
      },
    })
  })

  it('should handle disabled state correctly', () => {
    const wrapper = mount(VisualConfigEditor, {
      props: {
        values: DEFAULT_VISUAL_VALUES,
        disabled: true,
      },
    })

    // Check that all sections receive the disabled prop
    const serverSection = wrapper.findComponent({ name: 'ServerConfigSection' })
    const tlsSection = wrapper.findComponent({ name: 'TlsConfigSection' })
    const systemSection = wrapper.findComponent({ name: 'SystemConfigSection' })

    expect(serverSection.props('disabled')).toBe(true)
    expect(tlsSection.props('disabled')).toBe(true)
    expect(systemSection.props('disabled')).toBe(true)
  })
})

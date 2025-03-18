import React, { useState, useEffect } from 'react'
import { Language } from '../../../config/settings'
import { useSettings } from '../../../hooks/useSettings'
import { capitalizeText } from '../../../lib/capitalizeText'
import FieldWrapper from '../Elements/FieldWrapper'
import SectionHeading from '../Elements/SectionHeading'
import * as Switch from '@radix-ui/react-switch'

const TranslateSettings = () => {
  const [settings, setSettings] = useSettings()

  const translateSettings = settings.autoTranslation

  const [threadSize, setThreadSize] = useState(translateSettings.thread);
  const [batchSize, setBatchSize] = useState(translateSettings.batchSize);


  const handleEnableAutoTranslateChange = (enabled: boolean) => {
    setSettings({
      ...settings,
      autoTranslation: {
        ...translateSettings,
        enabled: enabled,
      },
    })
  }

  

  return (
    <div className="cdx-w-full cdx-flex-shrink-0 cdx-rounded-md">
      <SectionHeading title="Translate" />
      <FieldWrapper
        title="Enable Translate"
        description="translate"
        row={true}
      >
        <Switch.Root
          checked={translateSettings.enabled}
          onCheckedChange={handleEnableAutoTranslateChange}
          className="cdx-w-[42px] cdx-h-[25px] cdx-bg-neutral-500 cdx-rounded-full cdx-relative data-[state=checked]:cdx-bg-blue-500 cdx-outline-none cdx-cursor-default"
        >
          <Switch.Thumb className="cdx-block cdx-w-[21px] cdx-h-[21px] cdx-bg-white cdx-rounded-full cdx-transition-transform cdx-duration-100 cdx-translate-x-0.5 cdx-will-change-transform data-[state=checked]:cdx-translate-x-[19px]" />
        </Switch.Root>
      </FieldWrapper>
      <FieldWrapper
        title="Language"
        description="Language"
        row={true}
      >
        <select
          value={translateSettings.language}
          onChange={(e) => {
            setSettings({
              ...settings,
              autoTranslation: {
                ...translateSettings,
                language: e.target.value as unknown as Language,
              },
            })
          }}
          className="input cdx-w-36"
        >
          {Object.entries(Language)
            .map(([key, value]) => (
              <option key={key} value={value}>
                {capitalizeText(key.replace('_', ' ').toLowerCase())}
              </option>
            ))}
        </select>
      </FieldWrapper>

      <FieldWrapper
        title="Max Request Per Minute"
        description="Max Request Per Minute"
        row={true}
      >
        <input
          type="number"
          value={translateSettings.thread}
          onChange={(e) => {
            const newThreadSize = parseInt(e.target.value);
            setThreadSize(newThreadSize);
            setSettings({
              ...settings,
              autoTranslation: {
                ...translateSettings,
                thread: newThreadSize,
              },
            })
          }}
          className="input cdx-w-36"
        />
      </FieldWrapper>

      <FieldWrapper
        title="Batch Size"
        description="Batch Size"
        row={true}
      >
        <input
          type="number"
          value={translateSettings.batchSize}
          onChange={(e) => {
            const newBatchSize = parseInt(e.target.value);
            setBatchSize(newBatchSize);
            setSettings({
              ...settings,
              autoTranslation: {
                ...translateSettings,
                batchSize: newBatchSize,
              },
            })
          }}
          className="input cdx-w-36"
        />
      </FieldWrapper>
    </div>
  )
}

export default TranslateSettings

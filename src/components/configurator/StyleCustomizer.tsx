'use client';
import { STYLE_OPTIONS, WOOD_OPTIONS, HARDWARE } from '@/lib/design';


import React, { useState } from 'react';
import { ClosetConfiguration, UserPreferences } from '@/types/closet';
import { motion } from 'framer-motion';
import { Package, Sparkles, Shirt, Layers } from 'lucide-react';

const priorityIcons: Record<string, typeof Shirt> = { shoes: Package, hanging: Shirt, folded: Layers, accessories: Sparkles };

interface StyleCustomizerProps {
  config: Partial<ClosetConfiguration>;
  onConfigChange: (config: Partial<ClosetConfiguration>) => void;
}

export function StyleCustomizer({ config, onConfigChange }: StyleCustomizerProps) {
  const [activeTab, setActiveTab] = useState<'materials' | 'colors' | 'layout'>('materials');

  const updateStyle = (field: keyof UserPreferences, value: string | boolean | string[]) => {
    onConfigChange({
      ...config,
      userInfo: {
        ...config.userInfo!,
        [field]: value
      }
    });
  };

  const woodFinishes = WOOD_OPTIONS;

  const stylePreferences = STYLE_OPTIONS;

  const hardwareOptions = [
    { id: 'chrome', name: 'Chrome', description: 'Polished modern chrome', color: HARDWARE.chrome },
    { id: 'brass', name: 'Brass', description: 'Warm antique brass', color: HARDWARE.brass },
    { id: 'black', name: 'Matte Black', description: 'Contemporary black finish', color: HARDWARE.black },
    { id: 'gold', name: 'Brushed Gold', description: 'Luxurious gold tone', color: HARDWARE.gold }
  ];

  const renderMaterialsTab = () => (
    <div className="space-y-6">
      {config.userInfo?.stylePreference==='minimal'&&<p className="text-sm">Minimal style uses concealed handles. Your hardware choice is saved and becomes visible with another style.</p>}
      {/* Wood Finish Selection */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Wood Finish</h4>
        <div className="grid grid-cols-2 gap-3">
          {woodFinishes.map((finish) => (
            <motion.button
              key={finish.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={config.userInfo?.woodFinish === finish.id} onClick={() => updateStyle('woodFinish', finish.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.woodFinish === finish.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div 
                className="w-full h-12 rounded mb-3"
                style={{ backgroundColor: finish.color }}
              />
              <div className="font-medium text-charcoal-600">{finish.name}</div>
              <div className="text-xs text-charcoal-400">{finish.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Hardware Selection */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Hardware Finish</h4>
        <div className="grid grid-cols-2 gap-3">
          {hardwareOptions.map((hardware) => (
            <motion.button
              key={hardware.id}
              whileHover={{ scale: 1.02 }}
              aria-pressed={config.userInfo?.hardwareFinish === hardware.id} onClick={() => updateStyle('hardwareFinish', hardware.id)}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.hardwareFinish === hardware.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: hardware.color }}
                />
                <div>
                  <div className="font-medium text-charcoal-600 text-sm">{hardware.name}</div>
                  <div className="text-xs text-charcoal-400">{hardware.description}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderColorsTab = () => (
    <div className="space-y-6">
      {/* Style Preference */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Design Style</h4>
        <div className="space-y-3">
          {stylePreferences.map((style) => (
            <motion.button
              key={style.id}
              whileHover={{ scale: 1.01 }}
              aria-pressed={config.userInfo?.stylePreference === style.id} onClick={() => updateStyle('stylePreference', style.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.stylePreference === style.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div className="flex items-center space-x-4">
                <span className="settings-style-swatch" data-style={style.id} aria-hidden="true"><span/><span/></span>
                <div>
                  <div className="font-medium text-charcoal-600">{style.name}</div>
                  <div className="text-sm text-charcoal-400">{style.description}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Interior Color Accents */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Interior Accent Color</h4>
        <div className="grid grid-cols-4 gap-3">
          {[
            { name: 'None', color: 'transparent' },
            { name: 'Soft Pink', color: '#f8e8e8' },
            { name: 'Sage Green', color: '#e8f0e8' },
            { name: 'Powder Blue', color: '#e8f0f8' },
            { name: 'Warm Gray', color: '#f0f0f0' },
            { name: 'Cream', color: '#fef7ed' },
            { name: 'Lavender', color: '#f0e8f8' },
            { name: 'Champagne', color: '#f8f0e8' }
          ].map((color, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateStyle('accentColor', color.color)}
              className={`
                w-12 h-12 rounded-lg border-2 transition-all
                ${config.userInfo?.accentColor === color.color 
                  ? 'border-taupe-400 shadow-lg' 
                  : 'border-cream-200'
                }
              `}
              style={{ backgroundColor: color.color }}
              title={color.name} aria-label={color.name} aria-pressed={config.userInfo?.accentColor === color.color}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div className="space-y-6">
      {/* Drawer Preference */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Drawer Configuration</h4>
        <div className="space-y-3">
          {[
            { id: 'many-small', name: 'Many Small Drawers', description: 'More organization, easier to find items' },
            { id: 'few-large', name: 'Few Large Drawers', description: 'Cleaner look, easier to access' },
            { id: 'mixed', name: 'Mixed Sizes', description: 'Balanced approach, most flexible' }
          ].map((option) => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01 }}
              aria-pressed={config.userInfo?.drawerPreference === option.id} onClick={() => updateStyle('drawerPreference', option.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.drawerPreference === option.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div className="font-medium text-charcoal-600">{option.name}</div>
              <div className="text-sm text-charcoal-400 mt-1">{option.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Priority Items */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Storage Priorities</h4>
        <p className="text-sm text-charcoal-400 mb-3">What&apos;s most important to you?</p>
        <div className="space-y-2">
          {[
            { id: 'shoes', name: 'Shoe Storage', icon: '👠' },
            { id: 'hanging', name: 'Hanging Space', icon: '👔' },
            { id: 'folded', name: 'Folded Items', icon: '👕' },
            { id: 'accessories', name: 'Accessories', icon: '👜' }
          ].map((priority) => {
            const isSelected = config.userInfo?.priorityItems?.includes(priority.id as UserPreferences['priorityItems'][number]);
            return (
              <motion.label
                key={priority.id}
                whileHover={{ scale: 1.01 }}
                className={`
                  flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-taupe-400 bg-taupe-50' : 'border-cream-200 hover:border-cream-300'}
                `}
              >
                <input
                  type="checkbox"
                  checked={!!isSelected}
                  onChange={(e) => {
                    const current = config.userInfo?.priorityItems || [];
                    const updated = e.target.checked 
                      ? [...current, priority.id]
                      : current.filter(item => item !== priority.id);
                    updateStyle('priorityItems', updated);
                  }}
                  className="mr-3"
                />
                <span className="settings-choice-icon mr-3">{React.createElement(priorityIcons[priority.id], { size: 20, 'aria-hidden': true })}</span>
                <span className="font-medium text-charcoal-600">{priority.name}</span>
              </motion.label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="style-settings settings-card">
      <h3 className="font-serif text-xl text-charcoal-600 mb-6">
        Customize Your Style
      </h3>
      <p className="settings-description">Changes update the preview immediately. Choose Save to keep them in a named design.</p>

      {/* Tab Navigation */}
      <div role="tablist" aria-label="Style settings categories" className="settings-navigation flex flex-wrap gap-1 mb-6">
        {[
          { id: 'materials', name: 'Finishes' },
          { id: 'colors', name: 'Design style' },
          { id: 'layout', name: 'Storage layout' }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            role="tab" id={`style-editor-${tab.id}`} aria-controls={`style-panel-${tab.id}`} aria-selected={activeTab===tab.id} tabIndex={activeTab===tab.id?0:-1}
            onKeyDown={e=>{const keys=['materials','colors','layout'] as const,index=keys.indexOf(activeTab),next=e.key==='ArrowRight'?keys[(index+1)%3]:e.key==='ArrowLeft'?keys[(index+2)%3]:e.key==='Home'?keys[0]:e.key==='End'?keys[2]:null;if(next){e.preventDefault();setActiveTab(next);document.getElementById(`style-editor-${next}`)?.focus();}}}
            onClick={()=>setActiveTab(tab.id as 'materials'|'colors'|'layout')}
            className={`
              flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-charcoal-600 shadow-sm' 
                : 'text-charcoal-400 hover:text-charcoal-500'
              }
            `}
          >
            {tab.name}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab} role="tabpanel" id={`style-panel-${activeTab}`} aria-labelledby={`style-editor-${activeTab}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'colors' && renderColorsTab()}
        {activeTab === 'layout' && renderLayoutTab()}
      </motion.div>

      {/* Preview Summary */}
      <div className="settings-selection mt-6">
        <h5 className="font-medium text-charcoal-600 mb-3">Current Selection</h5>
        <div className="text-sm text-charcoal-500 space-y-1">
          <p>Style: {stylePreferences.find(style=>style.id===config.userInfo?.stylePreference)?.name || 'Not selected'}</p>
          <p>Wood Finish: {woodFinishes.find(finish=>finish.id===config.userInfo?.woodFinish)?.name || 'Not selected'}</p>
          <p>Hardware: {hardwareOptions.find(hardware=>hardware.id===config.userInfo?.hardwareFinish)?.name || 'Automatic for selected style'}</p>
          <p>Drawers: {({'many-small':'Many small drawers','few-large':'Few large drawers',mixed:'Mixed sizes'} as Record<string,string>)[config.userInfo?.drawerPreference??''] || 'Not selected'}</p>
          <p>Priorities: {config.userInfo?.priorityItems?.join(', ') || 'None selected'}</p>
        </div>
      </div>
    </div>
  );
}

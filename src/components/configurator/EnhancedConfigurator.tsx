'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { DimInput } from './DimensionInput';
import { STYLE_OPTIONS, WOOD_OPTIONS, dimensionErrors, EMPTY_WARDROBE, FOLDED_PER_DRAWER, formatInches, SHOE_SPACING } from '@/lib/design';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClosetConfiguration, VillaAmenities, WardrobeItems, ShoeCollection,
  ClosetDimensions, RoomDimensions, UserPreferences, ClosetType,
} from '@/types/closet';
import { Calculator, Shirt, Package, Palette, ChevronRight, ChevronLeft, Check, LayoutGrid, Sparkles } from 'lucide-react';

import { DimensionsStep, AmenitiesStep, getVillaFlag } from './SpaceSteps';
import { WardrobeStep, ShoesStep } from './InventorySteps';
import { PreferencesStep, ShapeStep } from './PreferenceSteps';
interface EnhancedConfiguratorProps {
  config: Partial<ClosetConfiguration>;
  onConfigChange: (config: Partial<ClosetConfiguration>) => void;
  userType: string;
}

type ConfigStep = 'shape' | 'dimensions' | 'wardrobe' | 'shoes' | 'preferences' | 'amenities';

export function EnhancedConfigurator({ config, onConfigChange, userType }: EnhancedConfiguratorProps) {
  const [currentStep, setCurrentStep] = useState<ConfigStep>('shape');
  const [dimensionEditsValid, setDimensionEditsValid] = useState(true);
  const localConfig = config;

  // Derive villa flag from current dimensions
  const isWalkIn = ['walkin-l', 'walkin-u', 'island', 'corridor', 'walkin-single'].includes(
    localConfig.closetType ?? ''
  );
  const W = isWalkIn ? (localConfig.roomDimensions?.roomWidth ?? 0) : (localConfig.dimensions?.width ?? 0);
  const D = isWalkIn ? (localConfig.roomDimensions?.roomDepth ?? 0) : (localConfig.dimensions?.depth ?? 0);
  const isVilla = getVillaFlag(W, D);

  const baseSteps: { key: ConfigStep; title: string; icon: React.ComponentType<any>; color: string }[] = [
    { key: 'shape',       title: 'Shape',     icon: LayoutGrid,  color: 'bg-amber-500'  },
    { key: 'dimensions',  title: 'Space',     icon: Calculator,  color: 'bg-blue-500'   },
    { key: 'wardrobe',    title: 'Wardrobe',  icon: Shirt,       color: 'bg-green-500'  },
    { key: 'shoes',       title: 'Shoes',     icon: Package,     color: 'bg-purple-500' },
    { key: 'preferences', title: 'Style',     icon: Palette,     color: 'bg-pink-500'   },
  ];

  const villaStep = { key: 'amenities' as ConfigStep, title: 'Amenities', icon: Sparkles, color: 'bg-[#B8966E]' };

  const steps = isVilla ? [...baseSteps, villaStep] : baseSteps;

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  const updateLocalConfig = (updates: Partial<ClosetConfiguration>) => {
    onConfigChange(updates);
  };

  // ── Step validation: disable Next until current step is complete ──────────
  const isStepValid = (step: ConfigStep): boolean => {
    switch (step) {
      case 'shape':      return !!localConfig.closetType;
      case 'dimensions': return dimensionEditsValid && dimensionErrors(localConfig).length === 0;
      case 'wardrobe':    return !!localConfig.wardrobe;
      case 'shoes':       return !!localConfig.shoes;
      case 'preferences': return !!localConfig.userInfo;
      case 'amenities':   return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].key);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].key);
    }
  };

  // If villa mode was just turned OFF (space shrunk), skip amenities if we're on it
  useEffect(() => {
    if (!isVilla && currentStep === 'amenities') {
      setCurrentStep('preferences');
    }
  }, [isVilla, currentStep]);

  return (
    <div className="studio-wizard">
      <div className="studio-setup-heading"><span className="studio-eyebrow">01 / YOUR BRIEF</span><span>Step {currentStepIndex+1} of {steps.length}</span></div>
      <nav className="studio-steps" aria-label="Design setup steps">{steps.map((step,index)=>{const Icon=step.icon;return <button key={step.key} type="button" aria-current={step.key===currentStep?'step':undefined} onClick={()=>{if(currentStep!=='dimensions'||isStepValid('dimensions')||index<currentStepIndex)setCurrentStep(step.key);}}><Icon className="w-4 h-4"/><span>{step.title}</span></button>;})}</nav>
      {/* Step Content */}
      <div className="studio-step-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'shape' && (
              <ShapeStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === 'dimensions' && (
              <DimensionsStep config={localConfig} onUpdate={updateLocalConfig} userType={userType} onValidityChange={setDimensionEditsValid} />
            )}
            {currentStep === 'wardrobe' && (
              <WardrobeStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === 'shoes' && (
              <ShoesStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === 'preferences' && (
              <PreferencesStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
            {currentStep === 'amenities' && (
              <AmenitiesStep config={localConfig} onUpdate={updateLocalConfig} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {currentStep === 'dimensions' && dimensionErrors(localConfig).length > 0 && <div role="alert" className="text-sm text-red-700">{dimensionErrors(localConfig).map(e => <p key={e}>{e}</p>)}</div>}
      {currentStep === 'shape' && !localConfig.closetType && <p role="status">Choose a closet shape to continue.</p>}
      {currentStep==='wardrobe'&&<details className="text-sm"><summary>Inventory starting point</summary><p className="my-2">Clear the current wardrobe and shoe counts to enter your own inventory.</p><button type="button" onClick={()=>onConfigChange({wardrobe:{...EMPTY_WARDROBE},shoes:{sneakers:0,heels:0,boots:0,flats:0}})}>Start with an empty inventory</button></details>}
      {/* Navigation */}
      <div className="studio-step-navigation">
        <button
          type="button"
          onClick={prevStep}
          {...{ autoComplete: 'off' }}
          disabled={currentStepIndex === 0}
          className="flex items-center space-x-2 px-6 py-3 bg-cream-200 text-charcoal-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={() => currentStepIndex === steps.length - 1 ? document.getElementById('closet-preview')?.scrollIntoView({ behavior: 'smooth' }) : nextStep()}
          disabled={!isStepValid(currentStep)}
          {...{ autoComplete: 'off' }}
          className="flex items-center space-x-2 px-6 py-3 bg-charcoal-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-charcoal-600 transition-colors"
        >
          <span>{currentStepIndex === steps.length - 1 ? 'Review design' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

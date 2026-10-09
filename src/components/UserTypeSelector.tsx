'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home, Users, Palette, Eye, Ruler } from 'lucide-react';

import type { UserRole as UserType } from '@/types/closet';
import { ROLE_WORKFLOWS } from '@/lib/userRoles';

interface UserTypeOption {
  type: UserType;
  icon: React.ComponentType<any>;
  color: string;
}

const userTypes: UserTypeOption[] = [
  {
    type: 'homeowner',
    icon: Home,
    color: 'bg-taupe-100 border-taupe-300 hover:bg-taupe-200'
  },
  {
    type: 'renter',
    icon: Users,
    color: 'bg-cream-100 border-cream-300 hover:bg-cream-200'
  },
  {
    type: 'designer',
    icon: Palette,
    color: 'bg-charcoal-100 border-charcoal-300 hover:bg-charcoal-200'
  },
  {
    type: 'architect',
    icon: Ruler,
    color: 'bg-taupe-100 border-taupe-300 hover:bg-taupe-200'
  },
  {
    type: 'browsing',
    icon: Eye,
    color: 'bg-gray-100 border-gray-300 hover:bg-gray-200'
  }
];

export function UserTypeSelector() {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const router = useRouter();

  const handleSelection = (type: UserType) => {
    setSelectedType(type);
    
    // Store user type in sessionStorage for later use
    try { sessionStorage.setItem('userType', type); sessionStorage.setItem('alveo-pending-role',type); } catch { /* Navigation still works without storage. */ }
    
    // Navigate to configure page after a brief delay
    setTimeout(() => {
      router.push('/configure');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userTypes.map((option, index) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          
          return (
            <motion.button
              key={option.type}
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300 }
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelection(option.type)}
              className={`
                relative p-8 rounded-2xl border-2 text-left transition-all duration-300
                ${option.color}
                ${isSelected ? 'ring-4 ring-charcoal-300 border-charcoal-400' : ''}
              `}
            >
              <div className="flex items-start space-x-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <Icon className="w-6 h-6 text-charcoal-500" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-serif text-2xl font-semibold text-charcoal-600 mb-2">
                    {ROLE_WORKFLOWS[option.type].label}
                  </h3>
                  <p className="text-charcoal-500 text-lg">
                    {ROLE_WORKFLOWS[option.type].introduction}
                  </p>
                </div>
              </div>
              
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 bg-charcoal-500 text-white rounded-full p-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {selectedType && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-charcoal-400 text-lg">
            Taking you to your personalized configurator...
          </p>
        </motion.div>
      )}
    </div>
  );
}
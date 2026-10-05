'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { ClosetSVGRenderer } from '@/renderer/ClosetSVGRenderer';
import { getPreset } from '@/lib/presets';
import { ArrowRight, Maximize2 } from 'lucide-react';

type StyleTag = 'All' | 'Minimal' | 'Glam' | 'Small Space' | 'Luxury' | 'Modern' | 'Rustic';

interface GalleryItem {
  id: number;
  title: string;
  style: StyleTag;
  sqft: string;
  description: string;
  accent: string;
  bg: string;
  svgPattern: 'minimal' | 'glam' | 'compact' | 'luxury' | 'modern' | 'rustic';
}

const items: GalleryItem[] = [
  {
    id: 1,
    title: 'The Clean Slate',
    style: 'Minimal',
    sqft: '8 × 6 ft',
    description: 'Light wood finish with hanging zones, drawers and open shelves on one fitted wall.',
    accent: 'text-charcoal-500',
    bg: 'bg-cream-50',
    svgPattern: 'minimal',
  },
  {
    id: 2,
    title: 'The Glam Suite',
    style: 'Glam',
    sqft: '12 × 10 ft',
    description: 'U-shaped storage with a jewelry drawer and dedicated shoe shelves.',
    accent: 'text-taupe-500',
    bg: 'bg-taupe-50',
    svgPattern: 'glam',
  },
  {
    id: 3,
    title: 'Urban Edit',
    style: 'Small Space',
    sqft: '5 × 4 ft',
    description: 'Compact reach-in with hanging, drawers and shoe shelving fitted to a five-foot wall.',
    accent: 'text-charcoal-400',
    bg: 'bg-cream-100',
    svgPattern: 'compact',
  },
  {
    id: 4,
    title: 'The Grand Reserve',
    style: 'Luxury',
    sqft: '16 × 12 ft',
    description: 'Dark finish, U-shaped storage and a central drawer island where aisle clearance permits.',
    accent: 'text-amber-700',
    bg: 'bg-amber-50',
    svgPattern: 'luxury',
  },
  {
    id: 5,
    title: 'Studio Line',
    style: 'Modern',
    sqft: '10 × 8 ft',
    description: 'Light finish with hanging space, drawers and open shelving on two adjacent walls.',
    accent: 'text-slate-500',
    bg: 'bg-slate-50',
    svgPattern: 'modern',
  },
  {
    id: 6,
    title: 'The Farmhouse',
    style: 'Rustic',
    sqft: '9 × 7 ft',
    description: 'Warm wood finish with open shelving, hanging zones and drawer storage.',
    accent: 'text-orange-800',
    bg: 'bg-orange-50',
    svgPattern: 'rustic',
  },
];

function ClosetSketch({ pattern }: { pattern: GalleryItem['svgPattern'] }) {
  const index = ['minimal','glam','compact','luxury','modern','rustic'].indexOf(pattern) + 1;
  const config = getPreset(String(index))!;
  const layout = new ClosetLayoutEngine(config).calculateLayout();
  const svg = new ClosetSVGRenderer(layout, { idPrefix: `gallery-${pattern}`, showDimensions: false, showLabels: false, style: config.userInfo.stylePreference, woodFinish: config.userInfo.woodFinish }).renderElevation();
  return <div className="w-full h-full overflow-hidden" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const tags: StyleTag[] = ['All', 'Minimal', 'Glam', 'Small Space', 'Luxury', 'Modern', 'Rustic'];

export default function GalleryPage() {
  const [activeTag, setActiveTag] = useState<StyleTag>('All');
  const [hoveredId, setHoveredId] = useState<number | null>(null);



  const filtered = activeTag === 'All' ? items : items.filter((i) => i.style === activeTag);

  return (
    <main id="main-content" className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="py-16 bg-cream-50 border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm uppercase tracking-widest text-taupe-400 font-medium mb-4"
          >
            Inspiration Gallery
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl md:text-6xl text-charcoal-600 mb-5"
          >
            Find your style
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-charcoal-400 max-w-xl mx-auto"
          >
            Browse layouts designed by the Alvéo engine. Pick one to start from — or begin fresh.
          </motion.p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="sticky top-16 z-30 bg-white border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-none">
            {tags.map((tag) => (
              <button
                key={tag}
                aria-pressed={activeTag === tag} onClick={() => setActiveTag(tag)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-charcoal-600 text-white'
                    : 'text-charcoal-400 hover:bg-cream-100 hover:text-charcoal-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group rounded-2xl overflow-hidden border border-cream-200 ${item.bg} `}
                >
                  {/* Sketch */}
                  <div className="relative h-52 p-4">
                    <ClosetSketch pattern={item.svgPattern} />

                  </div>

                  {/* Info */}
                  <div className="px-5 pb-5">
                    <div className="flex items-start justify-between mb-1">
                      <h2 className="font-serif text-xl text-charcoal-600">{item.title}</h2>
                      <span className={`text-xs font-medium uppercase tracking-wide mt-1 ${item.accent}`}>
                        {item.style}
                      </span>
                    </div>
                    <p className="text-xs text-taupe-400 mb-2">{item.sqft}</p>
                    <p className="text-sm text-charcoal-400 leading-relaxed">{item.description}</p>

                    <p className="text-xs mt-2">Engine-generated elevation preview. Open the preset to inspect all walls and fit warnings.</p>
                    {/* CTA */}
                    <Link
                      href={"/configure?preset=" + item.id}
                      className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-charcoal-500 hover:text-charcoal-700 group/link transition-colors"
                    >
                      View and customize layout
                      <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {filtered.length === 0 && (
            <p className="text-center text-charcoal-400 py-24">No layouts in this style yet.</p>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-cream-50 border-t border-cream-200">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl text-charcoal-600 mb-4">Ready for yours?</h2>
          <p className="text-charcoal-400 mb-8">Complete the guided steps and get a custom layout in seconds.</p>
          <Link
            href="/configure"
            className="inline-flex items-center gap-2 bg-charcoal-600 text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-charcoal-500 transition-colors"
          >
            Start configuring
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

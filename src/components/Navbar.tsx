'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/configure', label: 'Configure' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isHome = pathname === '/';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || !isHome
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-cream-200'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="group flex items-center gap-2">
          <span
            className={`font-serif text-2xl font-bold tracking-tight transition-colors ${
              scrolled || !isHome ? 'text-charcoal-600' : 'text-charcoal-600'
            }`}
          >
            Alvéo
          </span>
          <span
            className={`text-xs font-light tracking-widest uppercase transition-colors hidden sm:block ${
              scrolled || !isHome ? 'text-taupe-400' : 'text-taupe-500'
            }`}
          >
            Carved for you.
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative text-sm font-medium tracking-wide transition-colors ${
                    active
                      ? 'text-charcoal-600'
                      : 'text-charcoal-400 hover:text-charcoal-600'
                  }`}
                >
                  {label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-taupe-400 rounded-full"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTA */}
        <Link
          href="/configure"
          className="hidden md:inline-flex items-center gap-2 bg-charcoal-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-charcoal-500 transition-colors"
        >
          Start Designing
        </Link>

        {/* Mobile hamburger */}
        <button
          aria-label="Toggle menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-md text-charcoal-500 hover:bg-cream-100 transition-colors"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            id="mobile-navigation" onKeyDown={e => { if (e.key === 'Escape') { setMobileOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')?.focus(); } }} className="md:hidden bg-white border-b border-cream-200 px-6 pb-6 pt-2 space-y-1"
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block py-3 text-base font-medium border-b border-cream-100 last:border-0 transition-colors ${
                  pathname === href
                    ? 'text-charcoal-600'
                    : 'text-charcoal-400 hover:text-charcoal-600'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/configure"
              className="block mt-4 text-center bg-charcoal-600 text-white text-sm font-medium px-5 py-3 rounded-lg hover:bg-charcoal-500 transition-colors"
            >
              Start Designing
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

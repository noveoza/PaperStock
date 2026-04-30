import { Hero } from '../components/Hero/Hero';
import { Dashboard } from '../components/Dashboard/Dashboard';
import { Features } from '../components/Features/Features';
import { Stats } from '../components/Stats/Stats';
import { Pricing, FAQ } from '../components/Pricing/Pricing';
import { CTA } from '../components/Footer/Footer';

export function Landing() {
  return (
    <main data-screen-label="Landing">
      <Hero />
      <Dashboard />
      <Features />
      <Stats />
      <Pricing />
      <FAQ />
      <CTA />
    </main>
  );
}

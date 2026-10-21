import { useEffect } from 'react';
import '../components/landing/landing.css';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { ProductShowcase } from '../components/landing/ProductShowcase';
import { CefrLearningPath } from '../components/landing/CefrLearningPath';
import { AiPoweredSection } from '../components/landing/AiPoweredSection';
import { LearningJourney } from '../components/landing/LearningJourney';
import { MembershipPlans } from '../components/landing/MembershipPlans';
import { FaqSection } from '../components/landing/FaqSection';
import { FinalCtaAndFooter } from '../components/landing/FinalCtaAndFooter';

export default function LandingPage() {
  useEffect(() => {
    // SEO Page title & meta description update
    document.title = 'VocabularyAI — Học tiếng Anh thông minh hơn cùng AI | Chuẩn CEFR A1–C1';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Nền tảng học tiếng Anh trực tuyến thông minh tích hợp AI. Chinh phục từ vựng chuẩn CEFR A1-C1, ghi nhớ lâu dài với Spaced Repetition và luyện nói phản xạ cùng AI Tutor 24/7.'
    );
  }, []);

  return (
    <div className="lp-wrapper">
      <div className="lp-ambient-bg" aria-hidden="true" />
      <LandingNavbar />
      <main id="main-content">
        <HeroSection />
        <ProductShowcase />
        <CefrLearningPath />
        <AiPoweredSection />
        <LearningJourney />
        <MembershipPlans />
        <FaqSection />
      </main>
      <FinalCtaAndFooter />
    </div>
  );
}

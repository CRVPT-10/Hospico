import HospitalSearch from "../components/HospitalSearch";
import CTASection from "../components/CTASection";
import ImageSlider from "../components/ImageSlider";
import { Link } from "react-router-dom";
import {
  Search,
  Calendar,
  Bell,
  Clock,
  BarChart as ChartBar,
  Lock,
  ShieldCheck,
  Building2,
  BadgeCheck,
  Plus,
  ChevronRight,
  Star,
  FileText,
} from "lucide-react";
import Footer from "../components/Footer";

const Dashboard = () => {
  return (
    <div className="bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-indigo-500 to-sky-500 dark:from-indigo-600 dark:to-blue-900 px-4 pt-4 pb-0 sm:py-8 lg:py-10 transition-all duration-500">
        <div className="max-w-7xl mx-auto lg:px-8">
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-2 sm:mb-4 text-white">
            India's Healthcare Search Engine
          </h1>
          <p className="text-sm sm:text-base text-white mb-6">
            Connect with top rated hospitals and specialties in your area
          </p>
          <div className="mx-auto px-0 pt-4 sm:py-8 lg:py-10 -mt-2 sm:-mt-8">
            <HospitalSearch />
          </div>
        </div>
      </div>

      {/* SOCIAL PROOF SECTION */}
      <section className="bg-white dark:bg-slate-900 pt-8 sm:pt-10 pb-4 sm:pb-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-t-2xl rounded-b-xl bg-gradient-to-b from-[#f4f8ff] to-white dark:from-slate-800 dark:to-slate-900 border border-[#dbe7ff] dark:border-slate-700/70 px-3 sm:px-5 py-4 sm:py-6 shadow-sm">
            <div className="text-center mb-4">
              <h2 className="text-2xl sm:text-4xl font-bold text-[#1a2b62] dark:text-white">Real Patients. Real Experiences.</h2>
              <p className="text-[#7a86a8] dark:text-slate-400 text-sm sm:text-lg">India's First Verified Hospital Reviews</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap text-sm">
              <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                100% Verified
              </span>
              <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-500" />
                Real Visits
              </span>
              <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-500" />
                Trusted
              </span>
            </div>

            <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible pb-2 snap-x snap-mandatory md:snap-none">
              <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-start rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-[#1f2b54] dark:text-white leading-none">4.6</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">"Doctor explained everything clearly and answered all my questions."</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 text-white text-sm font-semibold mb-2">
                  <BadgeCheck className="w-4 h-4" />
                  Verified Patient
                </span>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Apollo Hospital,</p>
                <p className="text-2sm text-slate-600 dark:text-slate-400 mb-2">Hyderabad</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                  <Plus className="w-3 h-3 text-blue-500" />
                  General Surgery
                </span>
              </div>
              <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-start rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-[#1f2b54] dark:text-white leading-none">3.9</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 text-amber-200" />
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">"Long waiting time, but the treatment was effective."</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 text-white text-sm font-semibold mb-2">
                  <BadgeCheck className="w-4 h-4" />
                  Verified Patient
                </span>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Care Hospital,</p>
                <p className="text-2sm text-slate-600 dark:text-slate-400 mb-2">Vijayawada</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                    <Plus className="w-3 h-3 text-blue-500" />
                    Orthopedics
                  </span>
                  <span className="text-slate-400">...</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
              <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-start rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-[#1f2b54] dark:text-white leading-none">4.2</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 text-amber-200" />
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">"Helpful staff, clean facilities, and smooth appointment process."</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 text-white text-sm font-semibold mb-2">
                  <BadgeCheck className="w-4 h-4" />
                  Verified Patient
                </span>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Sunrise Hospital,</p>
                <p className="text-2sm text-slate-600 dark:text-slate-400 mb-2">Hyderabad</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                  <Plus className="w-3 h-3 text-blue-500" />
                  Cardiology
                </span>
              </div>
            </div>

            <div className="mt-5 text-center">
              <Link
                to="/find-hospitals"
                className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold"
              >
                Explore Trusted Hospitals
              </Link>
            </div>

            <div className="mt-6 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">How Reviews Are Verified</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center">
                  <Building2 className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  1. Visit Hospital
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center">
                  <FileText className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  2. Upload Proof
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center">
                  <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  3. We Verify
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center">
                  <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                  4. Review Goes Live
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPOSITION SECTION */}
      <section className="bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-800 py-16 mt-4 sm:mt-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* For Patients */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">For Patients</h2>
              <div className="space-y-12">
                <Feature
                  icon={<Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                  title="Find the Best, Instantly"
                  desc="Discover hospitals that match your exact needs — verified, rated, ready."
                />
                <Feature
                  icon={<Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                  title="Book In Seconds"
                  desc="Confirm appointments with your preferred provider, instantly — no calls, no queues."
                />
                <Feature
                  icon={<Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                  title="Stay Informed, Always"
                  desc="Get real-time confirmations and reminders across Email, SMS, and WhatsApp."
                />
              </div>
            </div>

            {/* For Hospitals */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                For Hospitals
              </h2>
              <div className="space-y-12">
                <Feature
                  icon={<Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                  title="Fill Your Slots, Effortlessly"
                  desc="Smart appointment automation to maximize your OPD and IPD flows."
                />
                <Feature
                  icon={<ChartBar className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                  title="Know. Grow. Repeat."
                  desc="Real-time dashboards to track bookings, patient behavior, and optimize operations."
                />
                <Feature
                  icon={<Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                  title="Built for Scale, Built for Security"
                  desc="Fully encrypted, hospital-grade tech. Integrates smoothly with your HMS/EHR."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMAGE SLIDER */}
      <div>
        <ImageSlider />
      </div>

      {/* CTA SECTION */}
      <div>
        <CTASection />
      </div>

      {/* Footer Section */}
      <div>
        <Footer />
      </div>
    </div>
  );
};

// Helper subcomponent for icons + text
const Feature = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="flex items-start gap-4">
    <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-full flex-shrink-0 transition-colors duration-200">{icon}</div>
    <div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  </div>
);

export default Dashboard;

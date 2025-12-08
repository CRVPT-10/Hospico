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
} from "lucide-react";
import Footer from "../components/Footer";

const Dashboard = () => {
  return (
    <div className="bg-gray-50">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-indigo-500 to-sky-500 mx-3 px-4 sm:py-8 lg:py-12">
        <div className="sm:px-15 lg:px-20">
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-2 sm:mb-4 text-white">
            Find the Best Healthcare Near You
          </h1>
          <p className="text-sm sm:text-base text-white mb-6">
            Connect with top rated hospitals and specialties in your area
          </p>
          <div className="mx-auto px-4 pt-6 sm:py-8 lg:py-12 -mt-8">
            <HospitalSearch />
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="max-w-7xl mx-auto px-4 mt-16">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/find-hospitals"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 text-center shadow-soft hover:shadow-hover transform hover:scale-[1.02]"
          >
            Book an Appointment
          </Link>
          <Link
            to="/partner-login"
            className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all duration-300 text-center shadow-soft hover:shadow-hover transform hover:scale-[1.02]"
          >
            Partner with Us
          </Link>
        </div>
      </div>

      {/* VALUE PROPOSITION SECTION */}
      <section className="bg-gradient-to-b from-blue-50/50 to-white py-16 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* For Patients */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900">For Patients</h2>
              <div className="space-y-12">
                <Feature
                  icon={<Search className="h-6 w-6 text-blue-600" />}
                  title="Find the Best, Instantly"
                  desc="Discover hospitals that match your exact needs — verified, rated, ready."
                />
                <Feature
                  icon={<Calendar className="h-6 w-6 text-blue-600" />}
                  title="Book In Seconds"
                  desc="Confirm appointments with your preferred provider, instantly — no calls, no queues."
                />
                <Feature
                  icon={<Bell className="h-6 w-6 text-blue-600" />}
                  title="Stay Informed, Always"
                  desc="Get real-time confirmations and reminders across Email, SMS, and WhatsApp."
                />
              </div>
            </div>

            {/* For Hospitals */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900">
                For Hospitals
              </h2>
              <div className="space-y-12">
                <Feature
                  icon={<Clock className="h-6 w-6 text-blue-600" />}
                  title="Fill Your Slots, Effortlessly"
                  desc="Smart appointment automation to maximize your OPD and IPD flows."
                />
                <Feature
                  icon={<ChartBar className="h-6 w-6 text-blue-600" />}
                  title="Know. Grow. Repeat."
                  desc="Real-time dashboards to track bookings, patient behavior, and optimize operations."
                />
                <Feature
                  icon={<Lock className="h-6 w-6 text-blue-600" />}
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
    <div className="bg-blue-50 p-3 rounded-full flex-shrink-0">{icon}</div>
    <div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </div>
  </div>
);

export default Dashboard;

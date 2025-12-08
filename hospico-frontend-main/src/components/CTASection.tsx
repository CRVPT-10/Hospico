import { Link } from "react-router-dom";

export default function CTASection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-8">
          Join thousands of patients who trust HospiCo for their healthcare
          needs
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/hospitals"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Find a Hospital
          </Link>
          <Link
            to="/register"
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Register Your Hospital
          </Link>
        </div>
      </div>
    </section>
  );
}

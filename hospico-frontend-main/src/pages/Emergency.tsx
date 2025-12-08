import { Phone, MapPin, AlertTriangle, Ambulance, ChevronFirst as FirstAid, Clock } from 'lucide-react';

export default function Emergency() {
  return (
    <div className="space-y-16">
      {/* Emergency Banner */}
      <section className="bg-red-600 text-white p-8 rounded-xl">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <AlertTriangle className="h-12 w-12" />
          <div>
            <h1 className="text-3xl font-bold mb-2">Emergency Services</h1>
            <p className="text-xl">
              If you're experiencing a medical emergency, call emergency services immediately:
              <a href="tel:911" className="ml-2 font-bold underline">911</a>
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-red-50 p-3 rounded-full w-fit mb-4">
              <Ambulance className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ambulance Service</h3>
            <p className="text-gray-600 mb-4">24/7 emergency medical transportation</p>
            <a href="tel:911" className="text-red-600 font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Now
            </a>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-red-50 p-3 rounded-full w-fit mb-4">
              <FirstAid className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Emergency Rooms</h3>
            <p className="text-gray-600 mb-4">Find nearest emergency facilities</p>
            <button className="text-red-600 font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Locate ER
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-red-50 p-3 rounded-full w-fit mb-4">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Wait Times</h3>
            <p className="text-gray-600 mb-4">Real-time ER wait time information</p>
            <button className="text-red-600 font-semibold flex items-center gap-2">
              Check Times
            </button>
          </div>
        </div>
      </section>

      {/* Emergency Guidelines */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">When to Seek Emergency Care</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <ul className="space-y-4">
            {[
              "Chest pain or difficulty breathing",
              "Severe abdominal pain",
              "Stroke symptoms (face drooping, arm weakness, speech difficulty)",
              "Severe head injury or loss of consciousness",
              "Uncontrolled bleeding",
              "Poisoning or overdose",
              "Severe allergic reactions",
              "Major burns or injuries"
            ].map((symptom) => (
              <li key={symptom} className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <span>{symptom}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Nearby Facilities */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Nearby Emergency Facilities</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              name: "City General Hospital ER",
              address: "123 Emergency Lane",
              waitTime: "15-20 minutes",
              distance: "0.8 miles"
            },
            {
              name: "Metropolitan Emergency Center",
              address: "456 Medical Drive",
              waitTime: "25-30 minutes",
              distance: "1.2 miles"
            }
          ].map((facility) => (
            <div key={facility.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-lg mb-2">{facility.name}</h3>
              <div className="space-y-2 text-gray-600">
                <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {facility.address} ({facility.distance})
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current wait: {facility.waitTime}
                </p>
              </div>
              <button className="mt-4 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Get Directions
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
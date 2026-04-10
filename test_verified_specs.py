import requests, json, time, random

time.sleep(2)

# Create NEW hospital with specializations that definitely exist
clinic_data = {
    'name': f'Spec Test Hospital {random.randint(1000,9999)}',
    'address': 'Test Address',
    'city': 'Hyderabad',
    'phone': '9999999999',
    'latitude': 17.5,
    'longitude': 78.5,
    'timings': '9am-6pm',
    'imageUrl': '/src/assets/images/default-hospital.jpg',
    'specializations': ['Cardiology', 'Neurosurgery', 'General Surgery']  # These should exist
}

print('\n=== CREATING WITH VERIFIED SPECIALIZATIONS ===')
print('Using specializations that were successfully seeded\n')

r = requests.post('http://localhost:8080/api/clinics', json=clinic_data)
print(f'CREATE Status: {r.status_code}')

if r.status_code == 200:
    new_clinic = r.json()
    clinic_id = new_clinic.get("clinicId")
    print(f'Clinic ID: {clinic_id}')
    print(f'Specializations in CREATE response: {new_clinic.get("specializations")}')
    
    time.sleep(2)
    r2 = requests.get(f'http://localhost:8080/api/clinics/id?id={clinic_id}')
    if r2.status_code == 200:
        fetched = r2.json()
        print(f'Specializations in GET response: {fetched.get("specializations")}')
        if fetched.get('specializations'):
            print('✅ SUCCESS - Specializations persisted!')
        else:
            print('❌ Specializations still not saving')

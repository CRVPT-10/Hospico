import requests, json, time, random

time.sleep(3)

# Create NEW hospital with specializations
clinic_data = {
    'name': f'Test Hospital {random.randint(1000,9999)}',
    'address': 'Test Address',
    'city': 'Hyderabad',
    'phone': '9999999999',
    'latitude': 17.5,
    'longitude': 78.5,
    'timings': '9am-6pm',
    'imageUrl': '/src/assets/images/default-hospital.jpg',
    'specializations': ['Cardiology', 'Neurology']
}

print('\n=== CREATING NEW CLINIC WITH SPECIALIZATIONS ===')
print(f'Payload: {json.dumps(clinic_data, indent=2)}\n')

r = requests.post('http://localhost:8080/api/clinics', json=clinic_data)
print(f'CREATE Status: {r.status_code}')

if r.status_code == 200:
    new_clinic = r.json()
    print(f'✅ Clinic created!')
    print(f'   ID: {new_clinic.get("clinicId")}')
    print(f'   Name: {new_clinic.get("name")}')
    print(f'   Specializations in response: {new_clinic.get("specializations")}')
    
    clinic_id = new_clinic.get("clinicId")
    
    # Verify with GET
    time.sleep(2)
    r2 = requests.get(f'http://localhost:8080/api/clinics/id?id={clinic_id}')
    if r2.status_code == 200:
        fetched = r2.json()
        print(f'\n✅ GET verification:')
        print(f'   Specializations: {fetched.get("specializations")}')
        if fetched.get('specializations'):
            print('   ✅✅ SUCCESS - Specializations persisting on CREATE!')
        else:
            print('   ⚠️ Specializations empty on GET')
else:
    print(f'❌ Error: {r.text[:200]}')

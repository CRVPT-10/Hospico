import requests, json, time

# Wait for backend to fully initialize
time.sleep(6)

print('Testing Shourya Hospital update with new token...\n')

# Try updating Shourya with specializations
update_data = {
    'name': 'Shourya Hospital',
    'address': '1-1-17, Harivillu complex, A. S. Rao Nagar',
    'city': 'Hyderabad',
    'timings': 'Open 24 Hours',
    'imageUrl': '/src/assets/images/default-hospital.jpg',
    'specializations': ['Cardiology', 'ENT', 'Neurology', 'Orthopedics']
}

r = requests.put('http://localhost:8080/api/clinics?id=26566000000112028', json=update_data)
print('UPDATE Status:', r.status_code)
if r.status_code == 200:
    print('SUCCESS! Update worked')
    result = r.json()
    print('Hospital:', result.get('name'))
    print('Specializations:', result.get('specializations'))
else:
    print('ERROR:', r.text[:300])

# Verify the update
print('\n\nVerifying specializations persisted...')
r2 = requests.get('http://localhost:8080/api/clinics/id?id=26566000000112028')
if r2.status_code == 200:
    clinic = r2.json()
    print('Hospital:', clinic.get('name'))
    print('Specializations:', clinic.get('specializations'))
    if clinic.get('specializations'):
        print('SUCCESS! Specializations persisting')
    else:
        print('WARNING: Specializations still empty')

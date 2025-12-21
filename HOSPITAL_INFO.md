# HospiCo Hospital Information - Data Model & Features

## Overview

HospiCo stores and displays comprehensive information about hospitals (clinics) including location, specializations, doctors, ratings, and more.

---

## Hospital (Clinic) Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Unique identifier |
| `name` | String | Hospital/Clinic name |
| `address` | String | Full street address |
| `city` | String | City name |
| `latitude` | Double | GPS latitude coordinate |
| `longitude` | Double | GPS longitude coordinate |
| `phone` | String | Contact phone number |
| `website` | String | Hospital website URL |
| `timings` | String | Operating hours |
| `rating` | Double | Average rating (0-5) |
| `reviews` | Integer | Number of reviews |
| `imageUrl` | String | Hospital image URL |
| `specializations` | List | List of medical specialties |
| `doctors` | List | List of doctors at hospital |

---

## Doctor Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Unique identifier |
| `name` | String | Doctor's full name |
| `qualifications` | String | Degrees (e.g., MBBS, MD) |
| `specialization` | String | Medical specialty |
| `experience` | String | Years of experience |
| `biography` | String | Doctor's bio/description |
| `imageUrl` | String | Doctor's photo URL |
| `clinic` | Clinic | Associated hospital |

---

## Specializations

Medical specialties are stored as separate entities and linked to hospitals via many-to-many relationship.

**Example Specializations:**
- Cardiology
- Orthopedics
- Pediatrics
- Dermatology
- Neurology
- Gynecology
- ENT (Ear, Nose, Throat)
- General Medicine
- Surgery
- Ophthalmology

---

## API Endpoints

### Get All Hospitals
```
GET /api/clinics
Query params:
  - city (optional): Filter by city
  - spec (optional): Filter by specialization(s)
  - search (optional): Search by name/address
```

### Get Hospital by ID
```
GET /api/clinics/id?id={hospitalId}
Returns: Full hospital details with doctors
```

### Get Nearby Hospitals
```
GET /api/clinics/nearby
Query params:
  - lat: User's latitude
  - lng: User's longitude
  - city (optional): Filter by city
  - specialization (optional): Filter by specialty
Returns: Hospitals within 5km with distance & estimated time
```

### Get All Hospitals Sorted by Distance
```
GET /api/clinics/sorted-by-distance
Query params:
  - lat: User's latitude
  - lng: User's longitude
  - city (optional): Filter by city
  - spec (optional): Filter by specialization(s)
  - search (optional): Search term
Returns: All hospitals sorted by distance with estimated travel time
```

### Create Hospital
```
POST /api/clinics
Body: ClinicRequestDTO
Returns: Created hospital details
```

### Delete Hospital
```
DELETE /api/clinics/id?id={hospitalId}
Returns: Success message
```

---

## Distance & Travel Time Calculation

The system uses the **Haversine formula** to calculate distance between user and hospital.

**Travel Time Estimation:**
| Distance | Speed Assumed | Example |
|----------|---------------|---------|
| < 5 km | 20 km/h | City traffic |
| 5-20 km | 30 km/h | Urban roads |
| > 20 km | 40 km/h | Highways |

---

## Frontend Display

### Hospital Listing Page (`/find-hospital`)
- Shows hospital cards with:
  - Image
  - Name
  - City/Address
  - Specializations (tags)
  - Rating & Reviews
  - Distance & Estimated Time
- Filters: City, Specialization, Search
- Sorts by distance (location-aware)

### Hospital Profile Page (`/find-hospital/:id`)
- Hero section with hospital image
- Hospital details (name, address, phone, timings)
- Embedded Google Map
- **Patient Reviews section** (social proof)
- **Doctors list** with:
  - Photo
  - Name & Specialization
  - Experience & Qualifications
  - Services & Timings tabs
  - Book Appointment button
- Specialization filter

---

## Database Tables

### `clinic` Table
```sql
CREATE TABLE clinic (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  latitude DOUBLE,
  longitude DOUBLE,
  phone VARCHAR(50),
  website VARCHAR(255),
  timings VARCHAR(255),
  rating DOUBLE,
  reviews INTEGER,
  image_url VARCHAR(500),
  UNIQUE (name, address, city)
);
```

### `doctor` Table
```sql
CREATE TABLE doctor (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255),
  qualifications VARCHAR(255),
  specialization VARCHAR(100),
  experience VARCHAR(50),
  biography TEXT,
  image_url VARCHAR(500),
  clinic_id BIGINT REFERENCES clinic(id)
);
```

### `specialization` Table
```sql
CREATE TABLE specialization (
  id BIGINT PRIMARY KEY,
  specialization VARCHAR(100)
);
```

### `clinic_specializations` (Join Table)
```sql
CREATE TABLE clinic_specializations (
  clinic_id BIGINT REFERENCES clinic(id),
  specializations_id BIGINT REFERENCES specialization(id),
  PRIMARY KEY (clinic_id, specializations_id)
);
```

---

## File Locations

| Component | Path |
|-----------|------|
| Entity: Clinic | `backend/src/main/java/.../entity/Clinic.java` |
| Entity: Doctor | `backend/src/main/java/.../entity/Doctor.java` |
| Entity: Specialization | `backend/src/main/java/.../entity/Specialization.java` |
| Controller | `backend/src/main/java/.../controller/ClinicController.java` |
| Service | `backend/src/main/java/.../service/ClinicService.java` |
| Frontend: Hospital List | `frontend/src/pages/FindHospital.tsx` |
| Frontend: Hospital Profile | `frontend/src/pages/HospitalProfile.tsx` |

---

*Last Updated: December 21, 2024*

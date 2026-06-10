# Hospico - Hospital Finder Application

A full-stack hospital booking application with React frontend and Spring Boot backend.

## Deployment on Zoho

This application is deployed with a Zoho-first setup:

### Services Included:
1. **Frontend** - Zoho Slate hosted React application
   - URL: `https://www.hospiico.com/`

2. **Backend** - Zoho Catalyst AppSail Spring Boot API
   

3. **Database** - Zoho Catalyst Data Store

### Environment Variables Needed:
- `ZOHO_PROJECT_ID`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_REGION`
- `ZOHO_STRATUS_BUCKET`
- `GROQ_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_MAPS_API_KEY`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`

### Deployment Notes:
- Backend runtime settings are defined in `app-config.json` and `catalyst.json`.
- AppSail health checks use `/api/health`.
- Frontend requests should point to the AppSail backend base URL through `VITE_API_BASE_URL`.
- The backend reads its Zoho Data Store and Stratus settings from `application.yml`.

### Status Checks:
1. Open the backend health endpoint: `/api/health`.
2. Open the root endpoint: `/` to confirm the API is up.
3. Confirm the frontend loads from the Zoho Slate host.
4. Verify clinic image upload and retrieval against Zoho Stratus.

### Local Development:
```bash
# Start all services with Docker Compose
docker-compose up -d

# Access the application:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Database: postgresql://localhost:5432
```

### Tech Stack:
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Spring Boot, Java
- **Database**: Zoho Catalyst Data Store
- **Deployment**: Zoho Slate, AppSail, Catalyst Stratus

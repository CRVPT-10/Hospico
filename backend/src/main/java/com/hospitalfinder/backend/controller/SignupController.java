package com.hospitalfinder.backend.controller;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.dto.LoginResponse;
import com.hospitalfinder.backend.dto.SignupRequest;
import com.hospitalfinder.backend.dto.UserData;
import com.hospitalfinder.backend.entity.Role;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.service.ClinicService;
import com.hospitalfinder.backend.service.JwtService;
import com.hospitalfinder.backend.service.UserStoreService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class SignupController {

    private static final String DOCTOR_EMAIL_DOMAIN = "@hospiico.com";
    private static final String HOSPITAL_EMAIL_DOMAIN = "@hospiico.com";
    private static final String ADMIN_BOOTSTRAP_EMAIL = "admin@hospiico.com";

    private final JwtService jwtService;
    private final UserStoreService userStoreService;
    private final ClinicService clinicService;

    public SignupController(
            JwtService jwtService, UserStoreService userStoreService, ClinicService clinicService) {
        this.jwtService = jwtService;
        this.userStoreService = userStoreService;
        this.clinicService = clinicService;
    }

    @PostMapping("/signup")
    public ResponseEntity<LoginResponse> signup(@RequestBody SignupRequest request, HttpServletResponse response) {
        return signupWithMongo(request, response);
    }

    @PostMapping("/partner/bootstrap")
    public ResponseEntity<?> createHospitalLogin(@RequestBody Map<String, String> request) {
        String clinicIdRaw = request.get("clinicId");
        if (clinicIdRaw == null || clinicIdRaw.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "clinicId is required"));
        }

        Long clinicId;
        try {
            clinicId = Long.parseLong(clinicIdRaw.trim());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "clinicId must be numeric"));
        }

        ClinicResponseDTO clinic;
        try {
            clinic = clinicService.getClinicById(clinicId);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Clinic not found"));
        }

        String hospitalName = clinic.getName();
        String phone = normalizePhone(firstNonBlank(request.get("phone"), clinic.getPhone(), "9999999999"));

        String email = firstNonBlank(request.get("email"), generateHospitalEmail(hospitalName, clinicId));
        if (userStoreService.existsByEmail(email)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Email already registered", "email", email));
        }

        String password = firstNonBlank(request.get("password"), generateTempPassword(clinicId));

        UserData userData = userStoreService.createUser(
                firstNonBlank(hospitalName, "Hospital"),
                email,
                phone,
                password,
                Role.HOSPITAL);

        if (userData == null || userData.getId() == null) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", "Failed to create hospital login"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Hospital login created");
        response.put("clinicId", clinicId);
        response.put("hospitalName", hospitalName);
        response.put("userId", userData.getId());
        response.put("email", email);
        response.put("password", password);
        response.put("role", userData.getRole() != null ? userData.getRole().name() : "HOSPITAL");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/bootstrap")
    public ResponseEntity<?> bootstrapAdmin(@RequestBody Map<String, String> request) {
        String email = firstNonBlank(request.get("email"));
        String password = firstNonBlank(request.get("password"));
        String name = firstNonBlank(request.get("name"), "admin");
        String phone = normalizePhone(firstNonBlank(request.get("phone"), "9999999999"));

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "email and password are required"));
        }

        if (!ADMIN_BOOTSTRAP_EMAIL.equalsIgnoreCase(email.trim())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Only admin@hospiico.com can be bootstrapped"));
        }

        String normalizedEmail = email.trim();
        UserData existing = userStoreService.findByEmail(normalizedEmail);
        if (existing == null) {
            UserData created = userStoreService.createUser(name, normalizedEmail, phone, password, Role.ADMIN);
            if (created == null) {
                return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Failed to create admin user"));
            }
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Admin user created",
                    "id", created.getId(),
                    "email", created.getEmail(),
                    "role", created.getRole() != null ? created.getRole().name() : "ADMIN"));
        }

        UserData updatedPassword = userStoreService.updateUser(
                normalizedEmail,
                name,
                phone,
                null,
                null,
                password);

        if (updatedPassword == null) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Failed to update admin password"));
        }

        UserData promoted = userStoreService.updateUserRole(normalizedEmail, Role.ADMIN);
        if (promoted == null) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Failed to promote user to ADMIN"));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User promoted to ADMIN",
                "id", promoted.getId(),
                "email", promoted.getEmail(),
                "role", promoted.getRole() != null ? promoted.getRole().name() : "ADMIN"));
    }

    private ResponseEntity<LoginResponse> signupWithMongo(SignupRequest request, HttpServletResponse response) {
        if (userStoreService.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(new LoginResponse(false, "Email already registered", null, null, null, null, null));
        }

        Role role = resolveSignupRole(request);
        UserData userData = userStoreService.createUser(
                request.getName(),
                request.getEmail(),
                request.getPhone(),
                request.getPassword(),
                role);

        // Generate JWT token - create temporary User entity for JWT generation
        User tempUser = new User();
        tempUser.setId(userData.getId());
        tempUser.setEmail(userData.getEmail());
        tempUser.setName(userData.getName());
        tempUser.setRole(userData.getRole());

        String jwtToken = jwtService.generateToken(tempUser);

        // Set cookies
        setCookies(response, jwtToken, userData.getEmail());

        return ResponseEntity.ok(new LoginResponse(
                true,
                "User registered successfully",
                userData.getId(),
                userData.getEmail(),
                userData.getName(),
                userData.getRole(),
                jwtToken));
    }

    // Postgres implementation removed

    private boolean isDoctorDomainEmail(String email) {
        return email != null && email.trim().toLowerCase().endsWith(DOCTOR_EMAIL_DOMAIN);
    }

    private Role resolveSignupRole(SignupRequest request) {
        Role requestedRole = request.getRole();
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (requestedRole == Role.ADMIN && ADMIN_BOOTSTRAP_EMAIL.equals(email)) {
            return Role.ADMIN;
        }

        return isDoctorDomainEmail(request.getEmail()) ? Role.DOCTOR : Role.USER;
    }

    private String generateHospitalEmail(String name, Long clinicId) {
        String base = (name == null ? "hospital" : name)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", ".")
                .replaceAll("\\.+", ".")
                .replaceAll("^\\.|\\.$", "");

        if (base.isBlank()) {
            base = "hospital";
        }
        return base + "." + clinicId + HOSPITAL_EMAIL_DOMAIN;
    }

    private String generateTempPassword(Long clinicId) {
        String idTail = String.valueOf(clinicId);
        if (idTail.length() > 4) {
            idTail = idTail.substring(idTail.length() - 4);
        }
        return "Hospico@" + idTail;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalizePhone(String value) {
        if (value == null || value.isBlank()) {
            return "9999999999";
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() >= 10) {
            return digits.substring(digits.length() - 10);
        }
        return value;
    }

    private void setCookies(HttpServletResponse response, String jwtToken, String email) {
        // Create JWT cookie
        Cookie jwtCookie = new Cookie("jwt_token", jwtToken);
        jwtCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        jwtCookie.setPath("/");
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(true);
        jwtCookie.setAttribute("SameSite", "None");
        response.addCookie(jwtCookie);

        // Create user info cookie
        Cookie userCookie = new Cookie("user_info", email);
        userCookie.setMaxAge(7 * 24 * 60 * 60);
        userCookie.setPath("/");
        userCookie.setHttpOnly(false);
        userCookie.setSecure(true);
        userCookie.setAttribute("SameSite", "None");
        response.addCookie(userCookie);
    }
}
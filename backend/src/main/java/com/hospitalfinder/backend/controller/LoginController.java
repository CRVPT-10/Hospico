package com.hospitalfinder.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.hospitalfinder.backend.dto.GoogleLoginRequest;
import com.hospitalfinder.backend.dto.LoginRequest;
import com.hospitalfinder.backend.dto.LoginResponse;
import com.hospitalfinder.backend.dto.UserData;
import com.hospitalfinder.backend.entity.Role;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.service.GoogleTokenVerifierService;
import com.hospitalfinder.backend.service.JwtService;
import com.hospitalfinder.backend.service.UserStoreService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final UserStoreService userStoreService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifierService googleTokenVerifierService;

    public LoginController(
            UserStoreService userStoreService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifierService googleTokenVerifierService) {
        this.userStoreService = userStoreService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifierService = googleTokenVerifierService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request, HttpServletResponse response) {
        return performLogin(request, response, null, "Login successful");
    }

    @PostMapping("/doctor/login")
    public ResponseEntity<LoginResponse> doctorLogin(@RequestBody LoginRequest request, HttpServletResponse response) {
        return performLogin(request, response, Role.DOCTOR, "Doctor login successful");
    }

    @PostMapping("/google")
    public ResponseEntity<LoginResponse> googleLogin(@RequestBody GoogleLoginRequest request, HttpServletResponse response) {
        if (request == null || request.getIdToken() == null || request.getIdToken().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new LoginResponse(false, "Google ID token is required", null, null, null, null, null));
        }

        try {
            GoogleIdToken.Payload payload = googleTokenVerifierService.verify(request.getIdToken());
            String email = payload.getEmail();

            if (email == null || email.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new LoginResponse(false, "Google account email is missing", null, null, null, null, null));
            }

            UserData userData = userStoreService.findByEmail(email);
            if (userData == null) {
                String name = payload.get("name") != null ? payload.get("name").toString() : "Google User";
                userData = userStoreService.createUser(
                        name,
                        email,
                    "",
                        java.util.UUID.randomUUID().toString(),
                        Role.USER);
            }

            if (userData == null || userData.getId() == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new LoginResponse(false, "Failed to login with Google", null, null, null, null, null));
            }

            User user = new User();
            user.setId(userData.getId());
            user.setEmail(userData.getEmail());
            user.setName(userData.getName());
            user.setRole(userData.getRole() != null ? userData.getRole() : Role.USER);

            String jwtToken = jwtService.generateToken(user);
            setAuthCookies(response, jwtToken, user.getEmail());

            return ResponseEntity.ok(new LoginResponse(
                    true,
                    "Google login successful",
                    user.getId(),
                    user.getEmail(),
                    user.getName(),
                    user.getRole(),
                    jwtToken));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new LoginResponse(false, ex.getMessage(), null, null, null, null, null));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(false, "Invalid Google token", null, null, null, null, null));
        }
    }

    private ResponseEntity<LoginResponse> performLogin(
            LoginRequest request,
            HttpServletResponse response,
            Role requiredRole,
            String successMessage) {
        UserData userData = userStoreService.findByEmail(request.getEmail());

        if (userData == null || !passwordEncoder.matches(request.getPassword(), userData.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(false, "Invalid credentials", null, null, null, null, null));
        }

        if (requiredRole != null && userData.getRole() != requiredRole) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new LoginResponse(false, "Doctor account required", null, null, null, null, null));
        }

        // Convert UserData to User POJO for JWT generation
        User user = new User();
        user.setId(userData.getId());
        user.setEmail(userData.getEmail());
        user.setName(userData.getName());
        user.setRole(userData.getRole());

        // Generate JWT token
        String jwtToken = jwtService.generateToken(user);

        setAuthCookies(response, jwtToken, user.getEmail());

        return ResponseEntity.ok(new LoginResponse(
                true,
            successMessage,
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                jwtToken));
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            jakarta.servlet.http.HttpServletRequest request) {

        // Try Authorization header first (Bearer token)
        String token = null;

        if (authorization != null && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        } else {
            // Fallback to cookie named "jwt_token"
            jakarta.servlet.http.Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (jakarta.servlet.http.Cookie c : cookies) {
                    if ("jwt_token".equals(c.getName())) {
                        token = c.getValue();
                        break;
                    }
                }
            }
        }

        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(false, "Missing token", null, null, null, null, null));
        }

        String email;
        try {
            // Assumes JwtService provides a method to extract username/email from token
            email = jwtService.extractUsername(token);
            // Optionally validate the token (if your JwtService exposes such method)
            if (!jwtService.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new LoginResponse(false, "Invalid token", null, null, null, null, null));
            }
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(false, "Invalid token", null, null, null, null, null));
        }

        UserData userData = userStoreService.findByEmail(email);
        if (userData == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(false, "User not found", null, null, null, null, null));
        }

        return ResponseEntity.ok(new LoginResponse(
                true,
                "User fetched",
                userData.getId(),
                userData.getEmail(),
                userData.getName(),
                userData.getRole(),
                token));
    }

    private void setAuthCookies(HttpServletResponse response, String jwtToken, String email) {
        Cookie jwtCookie = new Cookie("jwt_token", jwtToken);
        jwtCookie.setMaxAge(7 * 24 * 60 * 60);
        jwtCookie.setPath("/");
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(true);
        jwtCookie.setAttribute("SameSite", "None");
        response.addCookie(jwtCookie);

        Cookie userCookie = new Cookie("user_info", email);
        userCookie.setMaxAge(7 * 24 * 60 * 60);
        userCookie.setPath("/");
        userCookie.setHttpOnly(false);
        userCookie.setSecure(true);
        userCookie.setAttribute("SameSite", "None");
        response.addCookie(userCookie);
    }
}
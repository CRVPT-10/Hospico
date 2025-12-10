package com.hospitalfinder.backend.controller;

import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.dto.UserUpdateDTO;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.repository.UserRepository;
import com.hospitalfinder.backend.service.JwtService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    private String extractToken(String authorizationHeader, jakarta.servlet.http.HttpServletRequest request) {
        String token = null;
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            token = authorizationHeader.substring(7);
        } else {
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
        return token;
    }

    private void applyUserUpdates(User user, UserUpdateDTO dto) {
        if (dto.getName() != null) user.setName(dto.getName());
        if (dto.getPhone() != null) user.setPhone(dto.getPhone());
        if (dto.getAge() != null) user.setAge(dto.getAge());
        if (dto.getGender() != null) user.setGender(dto.getGender());
        if (dto.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
    }

    private void sanitizeUser(User user) {
        user.setPassword(null);
    }

    // 1. Get user details
    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        // You may want to map to a UserResponseDTO instead of returning entity directly
        return ResponseEntity.ok(user);
    }

    // 2. Update user phone/password/age/gender by id
    @PatchMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody UserUpdateDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            jakarta.servlet.http.HttpServletRequest request) {

        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User userToUpdate = userOpt.get();

            // Basic token validation (kept minimal to match previous behavior)
            String token = extractToken(authorizationHeader, request);
            if (token == null || token.isBlank() || !jwtService.validateToken(token)) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            applyUserUpdates(userToUpdate, dto);
            User saved = userRepository.save(userToUpdate);
            sanitizeUser(saved);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.err.println("Error updating user: " + e.getMessage());
            return ResponseEntity.status(500).body("Error updating user: " + e.getMessage());
        }
    }

    // 2b. Update current user (by token)
    @PatchMapping("/me")
    public ResponseEntity<?> updateCurrentUser(
        @RequestBody UserUpdateDTO dto,
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        jakarta.servlet.http.HttpServletRequest request
    ) {
        try {
            String token = extractToken(authorizationHeader, request);
            if (token == null || token.isBlank()) {
                return ResponseEntity.status(401).body("Missing token");
            }
            if (!jwtService.validateToken(token)) {
                return ResponseEntity.status(401).body("Invalid or expired token");
            }

            String email = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(email);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }

            applyUserUpdates(user, dto);
            User saved = userRepository.save(user);
            sanitizeUser(saved);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.err.println("Error updating current user: " + e.getMessage());
            return ResponseEntity.status(500).body("Error updating current user: " + e.getMessage());
        }
    }

    // 3. Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok("User deleted successfully");
    }

    // 4. Get all users
    @GetMapping
    public ResponseEntity<?> getAllUsers(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        jakarta.servlet.http.HttpServletRequest request) {
        try {
            System.out.println("Get all users request");
            
            // Extract token from Authorization header or cookies
            String token = null;
            
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                token = authorizationHeader.substring(7);
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
            
            System.out.println("Token: " + token);
            
            if (token == null || token.isBlank()) {
                System.out.println("Missing authentication token");
                return ResponseEntity.status(401).body("Missing authentication token");
            }
            
            // Validate token
            if (!jwtService.validateToken(token)) {
                System.out.println("Invalid or expired token");
                return ResponseEntity.status(401).body("Invalid or expired token");
            }
            
            // Extract user email from token
            String email = jwtService.extractUsername(token);
            System.out.println("Email from token: " + email);
            
            // Find the user making the request
            User requestingUser = userRepository.findByEmail(email);
            if (requestingUser == null) {
                System.out.println("Requesting user not found");
                return ResponseEntity.status(401).body("User not found");
            }
            
            System.out.println("Requesting user ID: " + requestingUser.getId() + ", Email: " + requestingUser.getEmail() + ", Role: " + requestingUser.getRole());
            
            // Check if the requesting user is an admin
            if (!"ADMIN".equals(requestingUser.getRole().toString())) {
                System.out.println("Authorization failed - User is not an admin");
                return ResponseEntity.status(403).body("Access denied. Admin privileges required.");
            }
            
            System.out.println("Admin authorization successful");
            
            var users = userRepository.findAll();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            System.err.println("Error processing request: " + e.getMessage());
            return ResponseEntity.status(500).body("Error processing request: " + e.getMessage());
        }
    }

    // 5. Get current user profile (based on JWT token)
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        jakarta.servlet.http.HttpServletRequest request) {
        try {
            System.out.println("Get current user request");
            
            // Try Authorization header first (Bearer token)
            String token = null;
            
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                token = authorizationHeader.substring(7);
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
            
            System.out.println("Token: " + token);
            
            if (token == null || token.isBlank()) {
                return ResponseEntity.status(401).body("Missing token");
            }
            
            // Validate token first
            if (!jwtService.validateToken(token)) {
                return ResponseEntity.status(401).body("Invalid or expired token");
            }
            
            String email = jwtService.extractUsername(token);
            System.out.println("Email from token: " + email);
            
            User user = userRepository.findByEmail(email);
            if (user == null) {
                System.out.println("User not found");
                return ResponseEntity.notFound().build();
            }
            
            System.out.println("User found - ID: " + user.getId() + ", Email: " + user.getEmail());
            sanitizeUser(user);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            System.err.println("Error processing request: " + e.getMessage());
            return ResponseEntity.status(500).body("Error processing request: " + e.getMessage());
        }
    }
}
package com.hospitalfinder.backend.controller;

import com.hospitalfinder.backend.dto.SignupRequest;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.repository.UserRepository;
import com.hospitalfinder.backend.service.JwtService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class SignupController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public SignupController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody SignupRequest request, HttpServletResponse response) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        user = userRepository.save(user);

        // Generate JWT token
        String jwtToken = jwtService.generateToken(user);
        
        // Create JWT cookie
        Cookie jwtCookie = new Cookie("jwt_token", jwtToken);
        jwtCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        jwtCookie.setPath("/");
        jwtCookie.setHttpOnly(true); // For security - prevents XSS
        jwtCookie.setSecure(true); // Only sent over HTTPS
        response.addCookie(jwtCookie);

        // Create user info cookie (for frontend convenience)
        Cookie userCookie = new Cookie("user_info", user.getEmail());
        userCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        userCookie.setPath("/");
        userCookie.setHttpOnly(false); // Allow JavaScript access
        userCookie.setSecure(true);
        response.addCookie(userCookie);

        return ResponseEntity.ok("User registered successfully");
    }
}

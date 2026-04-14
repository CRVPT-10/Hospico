package com.hospitalfinder.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class SignupOtpService {

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int TOKEN_EXPIRY_MINUTES = 15;
    private static final int MAX_VERIFY_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final OtpEmailService otpEmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    private final Map<String, OtpSession> otpSessionsByEmail = new ConcurrentHashMap<>();
    private final Map<String, VerifiedSession> verifiedTokenSessions = new ConcurrentHashMap<>();

    public SignupOtpService(OtpEmailService otpEmailService) {
        this.otpEmailService = otpEmailService;
    }

    public void requestOtp(String name, String email) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedName = normalizeName(name);
        cleanupExpired();

        OtpSession existing = otpSessionsByEmail.get(normalizedEmail);
        Instant now = Instant.now();
        if (existing != null && now.isBefore(existing.resendAllowedAt)) {
            long waitSeconds = existing.resendAllowedAt.getEpochSecond() - now.getEpochSecond();
            throw new IllegalStateException("Please wait " + Math.max(waitSeconds, 1) + " seconds before requesting a new OTP");
        }

        String otp = generateOtp();
        String otpHash = sha256(otp);

        OtpSession session = new OtpSession(
                normalizedName,
                normalizedEmail,
                otpHash,
                now.plusSeconds(OTP_EXPIRY_MINUTES * 60L),
                now.plusSeconds(RESEND_COOLDOWN_SECONDS),
                0);

        otpSessionsByEmail.put(normalizedEmail, session);
        otpEmailService.sendSignupOtp(normalizedEmail, normalizedName, otp, OTP_EXPIRY_MINUTES);
    }

    public String verifyOtp(String name, String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedName = normalizeName(name);
        cleanupExpired();

        OtpSession session = otpSessionsByEmail.get(normalizedEmail);
        if (session == null) {
            throw new IllegalStateException("OTP not found. Please request a new OTP.");
        }

        if (Instant.now().isAfter(session.expiresAt)) {
            otpSessionsByEmail.remove(normalizedEmail);
            throw new IllegalStateException("OTP expired. Please request a new OTP.");
        }

        if (!session.name.equals(normalizedName)) {
            throw new IllegalStateException("Name does not match the OTP request.");
        }

        if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
            otpSessionsByEmail.remove(normalizedEmail);
            throw new IllegalStateException("Too many invalid attempts. Please request a new OTP.");
        }

        String incomingHash = sha256(otp == null ? "" : otp.trim());
        if (!session.otpHash.equals(incomingHash)) {
            session.attempts = session.attempts + 1;
            throw new IllegalStateException("Invalid OTP.");
        }

        otpSessionsByEmail.remove(normalizedEmail);

        String verificationToken = UUID.randomUUID().toString();
        verifiedTokenSessions.put(verificationToken,
                new VerifiedSession(normalizedName, normalizedEmail, Instant.now().plusSeconds(TOKEN_EXPIRY_MINUTES * 60L)));

        return verificationToken;
    }

    public boolean consumeVerificationToken(String name, String email, String verificationToken) {
        if (verificationToken == null || verificationToken.isBlank()) {
            return false;
        }

        cleanupExpired();

        VerifiedSession session = verifiedTokenSessions.get(verificationToken);
        if (session == null || Instant.now().isAfter(session.expiresAt)) {
            verifiedTokenSessions.remove(verificationToken);
            return false;
        }

        String normalizedEmail = normalizeEmail(email);
        String normalizedName = normalizeName(name);

        boolean match = session.email.equals(normalizedEmail) && session.name.equals(normalizedName);
        if (match) {
            verifiedTokenSessions.remove(verificationToken);
        }

        return match;
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        otpSessionsByEmail.entrySet().removeIf(entry -> now.isAfter(entry.getValue().expiresAt));
        verifiedTokenSessions.entrySet().removeIf(entry -> now.isAfter(entry.getValue().expiresAt));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        return email.trim().toLowerCase();
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        return name.trim();
    }

    private String generateOtp() {
        int min = (int) Math.pow(10, OTP_LENGTH - 1);
        int max = (int) Math.pow(10, OTP_LENGTH) - 1;
        int value = secureRandom.nextInt(max - min + 1) + min;
        return String.valueOf(value);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private static final class OtpSession {
        private final String name;
        private final String email;
        private final String otpHash;
        private final Instant expiresAt;
        private final Instant resendAllowedAt;
        private int attempts;

        private OtpSession(String name, String email, String otpHash, Instant expiresAt, Instant resendAllowedAt, int attempts) {
            this.name = name;
            this.email = email;
            this.otpHash = otpHash;
            this.expiresAt = expiresAt;
            this.resendAllowedAt = resendAllowedAt;
            this.attempts = attempts;
        }
    }

    private static final class VerifiedSession {
        private final String name;
        private final String email;
        private final Instant expiresAt;

        private VerifiedSession(String name, String email, Instant expiresAt) {
            this.name = name;
            this.email = email;
            this.expiresAt = expiresAt;
        }
    }
}

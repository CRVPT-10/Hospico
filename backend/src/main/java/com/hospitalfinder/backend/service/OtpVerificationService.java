package com.hospitalfinder.backend.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OtpVerificationService {

    private static final long OTP_TTL_SECONDS = 5 * 60;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, OtpSession> sessions = new ConcurrentHashMap<>();

    @Getter
    @AllArgsConstructor
    public static class OtpSession {
        private final String sessionId;
        private final String phone;
        private final String otpCode;
        private final Instant expiresAt;
        private final boolean verified;
    }

    public OtpSession sendOtp(String phone) {
        String normalizedPhone = normalizePhone(phone);
        String otp = String.format("%06d", random.nextInt(1_000_000));
        String sessionId = UUID.randomUUID().toString();
        OtpSession session = new OtpSession(sessionId, normalizedPhone, otp, Instant.now().plusSeconds(OTP_TTL_SECONDS),
                false);
        sessions.put(sessionId, session);

        // Stubbed delivery for dev/local. Replace with SMS gateway integration.
        log.info("OTP generated for phone {} session {} otp {}", normalizedPhone, sessionId, otp);
        return session;
    }

    public boolean verifyOtp(String sessionId, String otpCode) {
        OtpSession session = sessions.get(sessionId);
        if (session == null || Instant.now().isAfter(session.expiresAt) || session.verified) {
            return false;
        }
        if (session.otpCode.equals(otpCode)) {
            sessions.put(sessionId,
                    new OtpSession(session.sessionId, session.phone, session.otpCode, session.expiresAt, true));
            return true;
        }
        return false;
    }

    public OtpSession getVerifiedSession(String sessionId) {
        OtpSession session = sessions.get(sessionId);
        if (session == null || !session.verified || Instant.now().isAfter(session.expiresAt)) {
            return null;
        }
        return session;
    }

    public String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        return phone.replaceAll("[^0-9+]", "").trim();
    }
}

package com.hospitalfinder.backend.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ClinicPublicIdService {

    private static final String PREFIX = "c:";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int IV_LENGTH = 12;

    private final SecretKeySpec keySpec;
    private final SecureRandom secureRandom = new SecureRandom();

    public ClinicPublicIdService(@Value("${app.clinic-public-id.secret:HospicoDefaultClinicPublicIdSecret-ChangeMe}") String secret) {
        this.keySpec = new SecretKeySpec(deriveKey(secret), "AES");
    }

    public String encode(Long clinicId) {
        if (clinicId == null) {
            return null;
        }

        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            byte[] plain = PREFIX.concat(String.valueOf(clinicId)).getBytes(StandardCharsets.UTF_8);
            byte[] encrypted = cipher.doFinal(plain);

            ByteBuffer bb = ByteBuffer.allocate(iv.length + encrypted.length);
            bb.put(iv);
            bb.put(encrypted);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bb.array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encode clinic public id", e);
        }
    }

    public Long decode(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            throw new IllegalArgumentException("publicId is required");
        }

        try {
            byte[] all = Base64.getUrlDecoder().decode(publicId);
            if (all.length <= IV_LENGTH) {
                throw new IllegalArgumentException("Invalid publicId");
            }

            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[all.length - IV_LENGTH];
            System.arraycopy(all, 0, iv, 0, IV_LENGTH);
            System.arraycopy(all, IV_LENGTH, encrypted, 0, encrypted.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] plain = cipher.doFinal(encrypted);
            String payload = new String(plain, StandardCharsets.UTF_8);

            if (!payload.startsWith(PREFIX)) {
                throw new IllegalArgumentException("Invalid publicId payload");
            }

            return Long.parseLong(payload.substring(PREFIX.length()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid publicId", e);
        }
    }

    private byte[] deriveKey(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            byte[] key = new byte[16];
            System.arraycopy(hash, 0, key, 0, key.length);
            return key;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive encryption key", e);
        }
    }
}

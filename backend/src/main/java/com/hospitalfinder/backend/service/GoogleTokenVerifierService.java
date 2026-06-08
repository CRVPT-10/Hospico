package com.hospitalfinder.backend.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

@Service
public class GoogleTokenVerifierService {

    private final List<String> audiences;
    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierService(
            @Value("${google.oauth.client-id:}") String singleClientId,
            @Value("${google.oauth.client-ids:}") String multipleClientIds) {

        this.audiences = buildAudienceList(singleClientId, multipleClientIds);

        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(this.audiences)
                .build();
    }

    public GoogleIdToken.Payload verify(String idTokenString) {
        if (audiences.isEmpty()) {
            throw new IllegalStateException("Google OAuth client ID is not configured");
        }

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new IllegalArgumentException("Invalid Google ID token");
            }

            return idToken.getPayload();
        } catch (GeneralSecurityException | IOException ex) {
            throw new IllegalStateException("Google token verification failed", ex);
        }
    }

    private List<String> buildAudienceList(String singleClientId, String multipleClientIds) {
        List<String> list = Arrays.stream((multipleClientIds == null ? "" : multipleClientIds).split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toList());

        if (singleClientId != null && !singleClientId.isBlank() && !list.contains(singleClientId.trim())) {
            list.add(singleClientId.trim());
        }

        return Collections.unmodifiableList(list);
    }
}

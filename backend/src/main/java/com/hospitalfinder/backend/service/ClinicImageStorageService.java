package com.hospitalfinder.backend.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.Getter;

@Service
public class ClinicImageStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE);

    private final Path uploadRoot = Paths.get(System.getProperty("user.dir"), "uploads", "clinic-images");

    @Getter
    public static class StoredClinicImage {
        private final String fileName;
        private final String imageUrl;

        public StoredClinicImage(String fileName, String imageUrl) {
            this.fileName = fileName;
            this.imageUrl = imageUrl;
        }
    }

    public StoredClinicImage storeImage(MultipartFile file) throws IOException {
        validateFile(file);

        Files.createDirectories(uploadRoot);

        String contentType = normalizeContentType(file.getContentType());
        String extension = resolveExtension(contentType, file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString().replace("-", "") + extension;
        Path target = uploadRoot.resolve(fileName).normalize();

        if (!target.startsWith(uploadRoot.normalize())) {
            throw new IOException("Invalid image path");
        }

        Files.write(target, file.getBytes());
        return new StoredClinicImage(fileName, "/api/clinics/image/" + fileName);
    }

    public byte[] readImage(String fileName) throws IOException {
        Path filePath = resolveImagePath(fileName);
        return Files.readAllBytes(filePath);
    }

    public MediaType resolveImageMediaType(String fileName) {
        String normalized = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (normalized.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        return MediaType.IMAGE_JPEG;
    }

    private Path resolveImagePath(String fileName) throws IOException {
        if (fileName == null || fileName.isBlank()) {
            throw new IOException("Image file not found");
        }

        Path candidate = uploadRoot.resolve(fileName).normalize();
        if (!candidate.startsWith(uploadRoot.normalize()) || !Files.exists(candidate)) {
            throw new IOException("Image file not found");
        }
        return candidate;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Hospital image file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Hospital image must be 5MB or smaller");
        }

        String contentType = normalizeContentType(file.getContentType());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported hospital image type. Allowed: JPG, JPEG, PNG");
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        return contentType.trim().toLowerCase(Locale.ROOT);
    }

    private String resolveExtension(String contentType, String originalFilename) {
        if (MediaType.IMAGE_PNG_VALUE.equalsIgnoreCase(contentType)) {
            return ".png";
        }
        if (MediaType.IMAGE_JPEG_VALUE.equalsIgnoreCase(contentType)) {
            return ".jpg";
        }

        if (originalFilename != null) {
            String lower = originalFilename.toLowerCase(Locale.ROOT);
            if (lower.endsWith(".png")) {
                return ".png";
            }
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                return ".jpg";
            }
        }

        return ".jpg";
    }
}
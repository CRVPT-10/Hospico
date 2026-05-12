package com.hospitalfinder.backend.service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Zoho Stratus based image storage service.
 * Stores hospital images in Zoho CloudScale Stratus for persistence and scalability.
 * Images are stored permanently and accessible via Zoho's managed infrastructure.
 */
@Service
@RequiredArgsConstructor
public class ZohoFileStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE);
    private static final String LEGACY_FILE_STORE_FOLDER = "clinic-images";

    private final CloudScaleDataStoreService dataStoreService;

    @Value("${zoho.stratus.bucket:clinic-images}")
    private String stratusBucket;

    @Value("${zoho.stratus.bucket-url:}")
    private String stratusBucketUrl;

    @Value("${zoho.stratus.prefix:}")
    private String stratusPrefix;

    @Getter
    public static class StoredClinicImage {
        private final String fileName;
        private final String imageUrl;

        public StoredClinicImage(String fileName, String imageUrl) {
            this.fileName = fileName;
            this.imageUrl = imageUrl;
        }
    }

    /**
     * Stores an image in Zoho Stratus and records metadata in DataStore.
     */
    public StoredClinicImage storeImage(MultipartFile file) throws IOException {
        validateFile(file);

        String contentType = normalizeContentType(file.getContentType());
        String extension = resolveExtension(contentType, file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString().replace("-", "") + extension;
        
        try {
            String objectKey = buildObjectKey(fileName);
            dataStoreService.putStratusObject(stratusBucket, objectKey, file.getBytes(), contentType);

            // Record metadata in DataStore for tracking
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("fileName", fileName);
            metadata.put("originalName", file.getOriginalFilename());
            metadata.put("size", file.getSize());
            metadata.put("contentType", contentType);
            metadata.put("uploadedAt", System.currentTimeMillis());
            metadata.put("storageType", "stratus");
            metadata.put("bucket", stratusBucket);
            metadata.put("objectKey", objectKey);

            try {
                dataStoreService.insertRecord("clinic_image_metadata", metadata);
            } catch (RuntimeException metadataError) {
                // Metadata persistence is optional; keep upload successful if this table is absent.
            }

            // Generate URL for accessing the image
            String imageUrl = "/api/clinics/image/" + fileName;

            return new StoredClinicImage(fileName, imageUrl);
        } catch (Exception e) {
            throw new IOException("Failed to upload hospital image to Zoho Stratus: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves image data from Zoho Stratus.
     * Falls back to legacy File Store to keep old image URLs working.
     */
    public byte[] readImage(String fileName) throws IOException {
        if (fileName == null || fileName.isBlank()) {
            throw new IOException("Image file name is required");
        }

        try {
            return dataStoreService.getStratusObject(stratusBucket, buildObjectKey(fileName));
        } catch (Exception primaryError) {
            try {
                return dataStoreService.retrieveFile(LEGACY_FILE_STORE_FOLDER, fileName);
            } catch (Exception legacyError) {
                throw new IOException("Failed to retrieve image from Stratus or legacy File Store: "
                        + primaryError.getMessage(), primaryError);
            }
        }
    }

    /**
     * Determines media type based on file extension.
     */
    public MediaType resolveImageMediaType(String fileName) {
        String normalized = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (normalized.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        return MediaType.IMAGE_JPEG;
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

    private String resolveExtension(String contentType, String originalFileName) {
        String normalized = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        
        if (normalized.contains("png")) {
            return ".png";
        }
        
        if (originalFileName != null && originalFileName.contains(".")) {
            String ext = originalFileName.substring(originalFileName.lastIndexOf('.'));
            if (ext.length() > 0 && ext.length() <= 5) {
                return ext.toLowerCase(Locale.ROOT);
            }
        }
        
        return ".jpg";
    }

    private String buildObjectKey(String fileName) {
        String prefix = stratusPrefix == null ? "" : stratusPrefix.trim();
        if (prefix.isEmpty()) {
            return fileName;
        }
        if (prefix.endsWith("/")) {
            return prefix + fileName;
        }
        return prefix + "/" + fileName;
    }
}

package com.hospitalfinder.backend.service;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClinicImageStorageService {

    private final ZohoFileStorageService zohoFileStorageService;

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
        ZohoFileStorageService.StoredClinicImage storedImage = zohoFileStorageService.storeImage(file);
        return new StoredClinicImage(storedImage.getFileName(), storedImage.getImageUrl());
    }

    public byte[] readImage(String fileName) throws IOException {
        return zohoFileStorageService.readImage(fileName);
    }

    public org.springframework.http.MediaType resolveImageMediaType(String fileName) {
        return zohoFileStorageService.resolveImageMediaType(fileName);
    }
}
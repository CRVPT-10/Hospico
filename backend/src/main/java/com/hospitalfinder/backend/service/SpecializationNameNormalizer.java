package com.hospitalfinder.backend.service;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class SpecializationNameNormalizer {

    private static final Map<String, String> CANONICAL_ALIASES = buildCanonicalAliases();
    private static final Map<String, String> PREFERRED_DISPLAY_NAMES = buildPreferredDisplayNames();
    private static final Map<String, Integer> PRIORITY_ORDER = buildPriorityOrder();

    private SpecializationNameNormalizer() {
    }

    public static String toCanonicalKey(String rawName) {
        String normalized = normalizeBasic(rawName)
                .toLowerCase(Locale.ROOT)
                .replace('&', ' ')
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isEmpty()) {
            return "";
        }

        return CANONICAL_ALIASES.getOrDefault(normalized, normalized);
    }

    public static String toDisplayName(String rawName) {
        String canonical = toCanonicalKey(rawName);
        if (canonical.isEmpty()) {
            return "";
        }

        String preferred = PREFERRED_DISPLAY_NAMES.get(canonical);
        if (preferred != null) {
            return preferred;
        }

        String[] words = canonical.split(" ");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append(' ');
            }
            if (word.length() == 1) {
                sb.append(word.toUpperCase(Locale.ROOT));
            } else {
                sb.append(Character.toUpperCase(word.charAt(0)));
                sb.append(word.substring(1));
            }
        }
        return sb.toString();
    }

    private static String normalizeBasic(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private static Map<String, String> buildCanonicalAliases() {
        Map<String, String> map = new HashMap<>();

        map.put("anaesthesia", "anesthesiology");
        map.put("anaesthesiology", "anesthesiology");
        map.put("anaesthsiology", "anesthesiology");
        map.put("anaethesiology", "anesthesiology");

        map.put("orthopaedics", "orthopedics");
        map.put("ortopaedics", "orthopedics");

        map.put("paediatrics", "pediatrics");

        map.put("surgical oncoloy", "surgical oncology");
        map.put("surgical gastro enterology", "surgical gastroenterology");

        map.put("physiotherpay", "physiotherapy");
        map.put("physiotherpay unit", "physiotherapy");
        map.put("physiotherapy unit", "physiotherapy");

        map.put("dialysis unit", "dialysis");

        map.put("ent specialist", "ent");
        map.put("otolaryngology ent", "ent");
        map.put("ear nose throat", "ent");
        map.put("ear nose and throat", "ent");
        map.put("ear nose & throat", "ent");
        map.put("otorhinolaryngology", "ent");
        map.put("ear nose throat specialist", "ent");

        map.put("gynecology", "gynecology obstetrics");
        map.put("gynaecology", "gynecology obstetrics");
        map.put("obstetrics", "gynecology obstetrics");
        map.put("obg", "gynecology obstetrics");
        map.put("obstetrics and gynecology", "gynecology obstetrics");
        map.put("obstetrics & gynecology", "gynecology obstetrics");
        map.put("obstetrics and gynaecology", "gynecology obstetrics");
        map.put("obstetrics & gynaecology", "gynecology obstetrics");

        map.put("cardiothoracic surgery", "ct surgery");
        map.put("cardio thoracic surgery", "ct surgery");

        map.put("general physician", "general medicine");
        map.put("internal medicine", "general medicine");
        map.put("physician", "general medicine");
        map.put("neuro surgery", "neurosurgery");
        map.put("dental surgery", "dentist");
        map.put("dentistry", "dentist");
        map.put("dental", "dentist");
        map.put("physiotherapy", "physiotherapy");
        map.put("physical medicine", "physiotherapy");
        map.put("physical medicine and rehabilitation", "physiotherapy");
        map.put("rehabilitation medicine", "physiotherapy");
        map.put("gastroenterology", "gastroenterology");
        map.put("surgical gastroenterology", "gastroenterology");
        map.put("oncology", "oncology");
        map.put("surgical oncology", "oncology");
        map.put("cardiology", "cardiology");
        map.put("cardiologist", "cardiology");
        map.put("neurology", "neurology");
        map.put("neurologist", "neurology");
        map.put("pediatrics", "pediatrics");
        map.put("pediatrician", "pediatrics");
        map.put("dermatology", "dermatology");
        map.put("dermatologist", "dermatology");
        map.put("orthopedics", "orthopedics");
        map.put("orthopedic", "orthopedics");
        map.put("orthopaedic", "orthopedics");
        map.put("nephrology", "nephrology");
        map.put("nephrologist", "nephrology");
        map.put("pulmonology", "pulmonology");
        map.put("pulmonologist", "pulmonology");
        map.put("urology", "urology");
        map.put("urologist", "urology");
        map.put("radiology", "radiology");
        map.put("radiologist", "radiology");
        map.put("pathology", "pathology");
        map.put("pathologist", "pathology");
        map.put("psychiatry", "psychiatry");
        map.put("psychiatrist", "psychiatry");

        return map;
    }

    private static Map<String, String> buildPreferredDisplayNames() {
        Map<String, String> map = new HashMap<>();

        map.put("anesthesiology", "Anesthesiology");
        map.put("orthopedics", "Orthopedics");
        map.put("pediatrics", "Pediatrics");
        map.put("gynecology obstetrics", "Gynecology & Obstetrics");
        map.put("dentist", "Dentistry");
        map.put("general medicine", "General Medicine");
        map.put("general surgery", "General Surgery");
        map.put("surgical oncology", "Surgical Oncology");
        map.put("surgical gastroenterology", "Surgical Gastroenterology");
        map.put("physiotherapy", "Physiotherapy");
        map.put("dialysis", "Dialysis");
        map.put("ent", "ENT");
        map.put("ct surgery", "CT Surgery");
        map.put("gastroenterology", "Gastroenterology");
        map.put("oncology", "Oncology");
        map.put("cardiology", "Cardiology");
        map.put("neurology", "Neurology");
        map.put("nephrology", "Nephrology");
        map.put("urology", "Urology");
        map.put("radiology", "Radiology");
        map.put("pathology", "Pathology");
        map.put("psychiatry", "Psychiatry");
        map.put("dermatology", "Dermatology");
        map.put("pulmonology", "Pulmonology");
        map.put("family medicine", "Family Medicine");
        map.put("emergency medicine", "Emergency Medicine");
        map.put("geriatrics", "Geriatrics");
        map.put("rheumatology", "Rheumatology");
        map.put("plastic surgery", "Plastic Surgery");
        map.put("nuclear medicine", "Nuclear Medicine");

        return map;
    }

    private static Map<String, Integer> buildPriorityOrder() {
        Map<String, Integer> map = new HashMap<>();

        String[] ordered = new String[] {
                "general surgery",
                "general medicine",
                "pediatrics",
                "orthopedics",
                "gynecology obstetrics",
                "dermatology",
                "ent",
                "cardiology",
                "dentist",
                "neurology",
                "anesthesiology",
                "nephrology",
                "urology",
                "gastroenterology",
                "pulmonology",
                "radiology",
                "psychiatry",
                "family medicine",
                "emergency medicine",
                "pathology",
                "endocrinology",
                "oncology",
                "hematology",
                "rheumatology",
                "geriatrics",
                "physiotherapy",
                "plastic surgery",
                "neurosurgery",
                "ct surgery",
                "nuclear medicine",
                "dialysis"
        };

        for (int index = 0; index < ordered.length; index++) {
            map.put(ordered[index], index);
        }

        return map;
    }

    public static int getPriorityRank(String rawName) {
        String canonical = toCanonicalKey(rawName);
        return PRIORITY_ORDER.getOrDefault(canonical, Integer.MAX_VALUE);
    }
}

package com.hospitalfinder.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from:${spring.mail.username:}}")
    private String fromAddress;

    @Value("${app.signup.otp.allow-console-fallback:false}")
    private boolean allowConsoleFallback;

    public OtpEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendSignupOtp(String toEmail, String name, String otpCode, int expiryMinutes) {
        if (mailHost == null || mailHost.isBlank() || fromAddress == null || fromAddress.isBlank()) {
            if (allowConsoleFallback) {
                log.warn("SMTP not configured. OTP fallback enabled for local use. email={} otp={}", toEmail, otpCode);
                return;
            }
            throw new IllegalStateException("Email service is not configured. Please set SMTP settings.");
        }

        String safeName = (name == null || name.isBlank()) ? "User" : name.trim();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("HospiiCo Email Verification OTP");
        message.setText(
                "Hi " + safeName + ",\n\n"
                        + "Your verification code for HospiiCo signup is: " + otpCode + "\n\n"
                        + "This code expires in " + expiryMinutes + " minutes.\n"
                        + "If you did not request this, please ignore this email.\n\n"
                        + "Thanks,\nHospiiCo Team");

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            if (allowConsoleFallback) {
                log.warn("SMTP send failed. OTP fallback enabled for local use. email={} otp={}", toEmail, otpCode);
                return;
            }
            throw new RuntimeException("Failed to send OTP email", ex);
        }
    }
}

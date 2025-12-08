package com.hospitalfinder.backend.service;

import com.hospitalfinder.backend.dto.AppointmentRequestDTO;
import com.hospitalfinder.backend.dto.AppointmentResponseDTO;
import com.hospitalfinder.backend.entity.Appointment;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Doctor;
import com.hospitalfinder.backend.entity.User;
import com.hospitalfinder.backend.repository.AppointmentRepository;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.DoctorRepository;
import com.hospitalfinder.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final DoctorRepository doctorRepository;

    public AppointmentResponseDTO book(AppointmentRequestDTO dto) {

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Clinic clinic = clinicRepository.findById(dto.getClinicId())
                .orElseThrow(() -> new RuntimeException("Clinic not found"));

        Doctor doctor = doctorRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        LocalDateTime slot = LocalDateTime.parse(dto.getAppointmentTime());

        if (appointmentRepository.existsByDoctorIdAndAppointmentTime(doctor.getId(), slot)) {
            throw new RuntimeException("Time slot already booked!");
        }

        Appointment appointment = new Appointment();
        appointment.setUser(user);
        appointment.setClinic(clinic);
        appointment.setDoctor(doctor);
        appointment.setAppointmentTime(slot);
        appointment.setStatus("BOOKED");

        // patient details
        appointment.setPatientName(dto.getPatientName());
        appointment.setPatientAge(dto.getPatientAge());
        appointment.setPatientGender(dto.getPatientGender());
        appointment.setPatientPhone(dto.getPatientPhone());
        appointment.setPatientEmail(dto.getPatientEmail());

        appointmentRepository.save(appointment);
//        googleSheetsService.appendRow(
//                Arrays.asList(
//                        appointment.getId(),
//                        appointment.getUser().getName(),
//                        appointment.getUser().getEmail(),
//                        appointment.getUser().getPhone(),
//                        appointment.getDoctor().getName(),
//                        appointment.getDoctor().getSpecialization(),
//                        appointment.getAppointmentTime().toString()
//                )
//        );
        return new AppointmentResponseDTO(appointment);
    }
}

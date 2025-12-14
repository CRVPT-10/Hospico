package com.hospitalfinder.backend.dto;

import com.hospitalfinder.backend.entity.Appointment;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AppointmentResponseDTO {

    private Long id;
    private String clinicName;
    private String doctorName;
    private String doctorSpecialization;
    private String userName;
    private String appointmentTime;
    private String status;

    private String patientName;
    private Integer patientAge;
    private String patientGender;
    private String patientEmail;
    private String patientPhone;
    private String reason;

    public AppointmentResponseDTO(Appointment appointment) {
        this.id = appointment.getId();
        this.clinicName = appointment.getClinic().getName();
        this.doctorName = appointment.getDoctor().getName();
        this.doctorSpecialization = appointment.getDoctor().getSpecialization();
        this.userName = appointment.getUser().getName();
        this.appointmentTime = appointment.getAppointmentTime().toString();
        this.status = appointment.getStatus();

        this.patientName = appointment.getPatientName();
        this.patientAge = appointment.getPatientAge();
        this.patientGender = appointment.getPatientGender();
        this.patientEmail = appointment.getPatientEmail();
        this.patientPhone = appointment.getPatientPhone();
        this.reason = appointment.getReason();
    }
}

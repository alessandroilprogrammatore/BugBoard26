package com.bugboard26.controller;

import com.bugboard26.dto.CreateUserRequest;
import com.bugboard26.dto.MetricsResponse;
import com.bugboard26.dto.MonthlyReportResponse;
import com.bugboard26.model.User;
import com.bugboard26.repository.UserRepository;
import com.bugboard26.service.AnalyticsService;
import com.bugboard26.service.ExportService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AnalyticsService analyticsService;
    private final ExportService exportService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(
        AnalyticsService analyticsService,
        ExportService exportService,
        UserRepository userRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.analyticsService = analyticsService;
        this.exportService = exportService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/metrics")
    public ResponseEntity<MetricsResponse> getMetrics() {
        MetricsResponse metrics = analyticsService.getMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/reports/monthly")
    public ResponseEntity<MonthlyReportResponse> getMonthlyReport(
        @RequestParam String month
    ) {
        String[] parts = month.split("-");
        int year = Integer.parseInt(parts[0]);
        int monthNum = Integer.parseInt(parts[1]);

        MonthlyReportResponse report = analyticsService.getMonthlyReport(year, monthNum);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists: " + request.email());
        }

        User user = new User(
            request.email(),
            passwordEncoder.encode(request.password()),
            request.name(),
            request.role()
        );
        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
    }
}


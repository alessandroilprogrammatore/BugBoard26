package com.bugboard26.controller;

import com.bugboard26.dto.MetricsResponse;
import com.bugboard26.dto.MonthlyReportResponse;
import com.bugboard26.service.AnalyticsService;
import com.bugboard26.service.ExportService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AnalyticsService analyticsService;
    private final ExportService exportService;

    public AdminController(AnalyticsService analyticsService, ExportService exportService) {
        this.analyticsService = analyticsService;
        this.exportService = exportService;
    }

    @GetMapping("/metrics")
    public ResponseEntity<MetricsResponse> getMetrics() {
        MetricsResponse metrics = analyticsService.getMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/reports/monthly")
    public ResponseEntity<MonthlyReportResponse> getMonthlyReport(
        @RequestParam @DateTimeFormat(pattern = "yyyy-MM") String month
    ) {
        String[] parts = month.split("-");
        int year = Integer.parseInt(parts[0]);
        int monthNum = Integer.parseInt(parts[1]);

        MonthlyReportResponse report = analyticsService.getMonthlyReport(year, monthNum);
        return ResponseEntity.ok(report);
    }
}

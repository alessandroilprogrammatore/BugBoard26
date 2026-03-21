package com.bugboard26.controller;

import com.bugboard26.service.ExportService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/bugs.csv")
    public ResponseEntity<String> exportBugsCsv() {
        String csv = exportService.exportToCsv();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "bugs.csv");

        return ResponseEntity.ok()
            .headers(headers)
            .body(csv);
    }

    @GetMapping("/bugs.xlsx")
    public ResponseEntity<byte[]> exportBugsExcel(HttpServletResponse response) throws IOException {
        byte[] excelBytes = exportService.exportToExcel();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "bugs.xlsx");

        return ResponseEntity.ok()
            .headers(headers)
            .body(excelBytes);
    }

    @GetMapping("/bugs.pdf")
    public ResponseEntity<byte[]> exportBugsPdf() throws IOException {
        byte[] pdfBytes = exportService.exportToPdf();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "bugs.pdf");

        return ResponseEntity.ok()
            .headers(headers)
            .body(pdfBytes);
    }
}

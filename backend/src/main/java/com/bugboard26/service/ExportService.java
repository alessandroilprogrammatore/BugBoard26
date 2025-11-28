package com.bugboard26.service;

import com.bugboard26.model.Bug;
import com.bugboard26.repository.BugRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExportService {

    private final BugRepository bugRepository;

    public ExportService(BugRepository bugRepository) {
        this.bugRepository = bugRepository;
    }

    public String exportToCsv() {
        List<Bug> bugs = bugRepository.findAll();
        StringBuilder csv = new StringBuilder();

        // Header
        csv.append("ID,Title,Description,Type,Status,Priority,Created At,Deadline,Assignee,Labels\n");

        // Data
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        for (Bug bug : bugs) {
            csv.append(bug.getId()).append(",")
               .append(escapeCsv(bug.getTitle())).append(",")
               .append(escapeCsv(bug.getDescription())).append(",")
               .append(bug.getType()).append(",")
               .append(bug.getStatus()).append(",")
               .append(bug.getPriority() != null ? bug.getPriority() : "").append(",")
               .append(bug.getCreatedAt().format(formatter)).append(",")
               .append(bug.getDeadline() != null ? bug.getDeadline().format(formatter) : "").append(",")
               .append(bug.getAssignee() != null ? bug.getAssignee().getName() : "").append(",")
               .append(escapeCsv(bug.getLabels().stream().map(l -> l.getName()).reduce((a, b) -> a + "," + b).orElse("")))
               .append("\n");
        }

        return csv.toString();
    }

    public byte[] exportToExcel() throws IOException {
        List<Bug> bugs = bugRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Bugs");

            // Header
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "Title", "Description", "Type", "Status", "Priority", "Created At", "Deadline", "Assignee", "Labels"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            // Data
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            for (int i = 0; i < bugs.size(); i++) {
                Bug bug = bugs.get(i);
                Row row = sheet.createRow(i + 1);

                row.createCell(0).setCellValue(bug.getId().toString());
                row.createCell(1).setCellValue(bug.getTitle());
                row.createCell(2).setCellValue(bug.getDescription());
                row.createCell(3).setCellValue(bug.getType().toString());
                row.createCell(4).setCellValue(bug.getStatus().toString());
                row.createCell(5).setCellValue(bug.getPriority() != null ? bug.getPriority().toString() : "");
                row.createCell(6).setCellValue(bug.getCreatedAt().format(formatter));
                row.createCell(7).setCellValue(bug.getDeadline() != null ? bug.getDeadline().format(formatter) : "");
                row.createCell(8).setCellValue(bug.getAssignee() != null ? bug.getAssignee().getName() : "");
                row.createCell(9).setCellValue(bug.getLabels().stream().map(l -> l.getName()).reduce((a, b) -> a + "," + b).orElse(""));
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}

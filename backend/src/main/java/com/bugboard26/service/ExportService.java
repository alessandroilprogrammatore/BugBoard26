package com.bugboard26.service;

import com.bugboard26.model.Bug;
import com.bugboard26.repository.BugRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExportService {
    private static final DateTimeFormatter EXPORT_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final float PDF_MARGIN = 50f;
    private static final float PDF_LINE_HEIGHT = 14f;
    private static final float PDF_FONT_SIZE = 11f;

    private final BugRepository bugRepository;

    public ExportService(BugRepository bugRepository) {
        this.bugRepository = bugRepository;
    }

    public String exportToCsv() {
        List<Bug> bugs = getAllBugs();
        StringBuilder csv = new StringBuilder();

        // Header
        csv.append("ID,Title,Description,Type,Status,Priority,Created At,Deadline,Assignee,Labels\n");

        // Data
        for (Bug bug : bugs) {
            csv.append(bug.getId()).append(",")
               .append(escapeCsv(bug.getTitle())).append(",")
               .append(escapeCsv(bug.getDescription())).append(",")
               .append(bug.getType()).append(",")
               .append(bug.getStatus()).append(",")
               .append(bug.getPriority() != null ? bug.getPriority() : "").append(",")
               .append(bug.getCreatedAt().format(EXPORT_DATE_FORMAT)).append(",")
               .append(bug.getDeadline() != null ? bug.getDeadline().format(EXPORT_DATE_FORMAT) : "").append(",")
               .append(bug.getAssignee() != null ? bug.getAssignee().getName() : "").append(",")
               .append(escapeCsv(bug.getLabels().stream().map(l -> l.getName()).reduce((a, b) -> a + "," + b).orElse("")))
               .append("\n");
        }

        return csv.toString();
    }

    public byte[] exportToExcel() throws IOException {
        List<Bug> bugs = getAllBugs();

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
            for (int i = 0; i < bugs.size(); i++) {
                Bug bug = bugs.get(i);
                Row row = sheet.createRow(i + 1);

                row.createCell(0).setCellValue(bug.getId().toString());
                row.createCell(1).setCellValue(bug.getTitle());
                row.createCell(2).setCellValue(bug.getDescription());
                row.createCell(3).setCellValue(bug.getType().toString());
                row.createCell(4).setCellValue(bug.getStatus().toString());
                row.createCell(5).setCellValue(bug.getPriority() != null ? bug.getPriority().toString() : "");
                row.createCell(6).setCellValue(bug.getCreatedAt().format(EXPORT_DATE_FORMAT));
                row.createCell(7).setCellValue(bug.getDeadline() != null ? bug.getDeadline().format(EXPORT_DATE_FORMAT) : "");
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

    public byte[] exportToPdf() throws IOException {
        List<Bug> bugs = getAllBugs();

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDPageContentStream contentStream = new PDPageContentStream(document, page);
            float y = page.getMediaBox().getHeight() - PDF_MARGIN;

            y = writeLine(contentStream, page, y, "BugBoard26 - Export bug", PDType1Font.HELVETICA_BOLD, 16f);
            y = writeLine(contentStream, page, y, "Totale bug: " + bugs.size(), PDType1Font.HELVETICA, PDF_FONT_SIZE);
            y -= PDF_LINE_HEIGHT / 2;

            for (Bug bug : bugs) {
                List<String> bugLines = buildPdfLines(bug);
                for (String line : bugLines) {
                    if (y <= PDF_MARGIN) {
                        contentStream.close();
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        contentStream = new PDPageContentStream(document, page);
                        y = page.getMediaBox().getHeight() - PDF_MARGIN;
                    }
                    y = writeLine(contentStream, page, y, line, PDType1Font.HELVETICA, PDF_FONT_SIZE);
                }
                y -= PDF_LINE_HEIGHT / 2;
            }

            contentStream.close();
            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }

    private List<Bug> getAllBugs() {
        return bugRepository.findAll();
    }

    private List<String> buildPdfLines(Bug bug) throws IOException {
        List<String> lines = new ArrayList<>();
        lines.add("ID: " + sanitizePdfText(bug.getId().toString()));
        lines.add("Title: " + sanitizePdfText(bug.getTitle()));
        lines.addAll(wrapPdfText("Description: " + sanitizePdfText(bug.getDescription()), 90));
        lines.add("Type: " + bug.getType() + " | Status: " + bug.getStatus() + " | Priority: "
            + (bug.getPriority() != null ? bug.getPriority() : "-"));
        lines.add("Created: " + bug.getCreatedAt().format(EXPORT_DATE_FORMAT) + " | Deadline: "
            + (bug.getDeadline() != null ? bug.getDeadline().format(EXPORT_DATE_FORMAT) : "-"));
        lines.add("Assignee: " + sanitizePdfText(bug.getAssignee() != null ? bug.getAssignee().getName() : "-"));
        lines.add("Labels: " + sanitizePdfText(bug.getLabels().stream().map(l -> l.getName()).reduce((a, b) -> a + ", " + b).orElse("-")));
        lines.add("");
        return lines;
    }

    private float writeLine(
        PDPageContentStream contentStream,
        PDPage page,
        float y,
        String text,
        PDType1Font font,
        float fontSize
    ) throws IOException {
        contentStream.beginText();
        contentStream.setFont(font, fontSize);
        contentStream.newLineAtOffset(PDF_MARGIN, y);
        contentStream.showText(text);
        contentStream.endText();
        return y - PDF_LINE_HEIGHT;
    }

    private List<String> wrapPdfText(String text, int maxChars) {
        List<String> lines = new ArrayList<>();
        String remaining = text;
        while (remaining.length() > maxChars) {
            int splitAt = remaining.lastIndexOf(' ', maxChars);
            if (splitAt <= 0) {
                splitAt = maxChars;
            }
            lines.add(remaining.substring(0, splitAt).trim());
            remaining = remaining.substring(splitAt).trim();
        }
        if (!remaining.isEmpty()) {
            lines.add(remaining);
        }
        return lines;
    }

    private String sanitizePdfText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "");
        return normalized
            .replace('\n', ' ')
            .replace('\r', ' ')
            .replace('\t', ' ');
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}

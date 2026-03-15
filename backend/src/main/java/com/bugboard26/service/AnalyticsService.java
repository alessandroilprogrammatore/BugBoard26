package com.bugboard26.service;

import com.bugboard26.dto.MetricsResponse;
import com.bugboard26.dto.MonthlyReportResponse;
import com.bugboard26.model.Bug;
import com.bugboard26.model.BugStatus;
import com.bugboard26.repository.BugRepository;
import com.bugboard26.repository.HistoryRepository;
import com.bugboard26.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final BugRepository bugRepository;
    private final UserRepository userRepository;
    private final HistoryRepository historyRepository;

    public AnalyticsService(
        BugRepository bugRepository,
        UserRepository userRepository,
        HistoryRepository historyRepository
    ) {
        this.bugRepository = bugRepository;
        this.userRepository = userRepository;
        this.historyRepository = historyRepository;
    }

    public MetricsResponse getMetrics() {
        List<Bug> allBugs = bugRepository.findAll();

        long open = allBugs.stream().filter(b -> b.getStatus() == BugStatus.TODO).count();
        long inProgress = allBugs.stream().filter(b -> b.getStatus() == BugStatus.IN_PROGRESS).count();
        long resolved = allBugs.stream().filter(b -> b.getStatus() == BugStatus.RESOLVED).count();
        long archived = allBugs.stream().filter(b -> b.getArchived()).count();

        Map<String, Long> assignedPerUser = allBugs.stream()
            .filter(b -> b.getAssignee() != null)
            .collect(Collectors.groupingBy(
                b -> b.getAssignee().getEmail(),
                Collectors.counting()
            ));

        List<Bug> resolvedBugs = allBugs.stream()
            .filter(b -> b.getStatus() == BugStatus.RESOLVED)
            .toList();

        double avgResolutionDays = resolvedBugs.stream()
            .mapToLong(b -> Duration.between(
                b.getCreatedAt(),
                b.getUpdatedAt() != null ? b.getUpdatedAt() : LocalDateTime.now()
            ).toDays())
            .average()
            .orElse(0.0);

        Map<String, Double> avgResolutionDaysPerUser = resolvedBugs.stream()
            .filter(b -> b.getAssignee() != null)
            .collect(Collectors.groupingBy(
                b -> b.getAssignee().getEmail(),
                Collectors.averagingDouble(b -> Duration.between(
                    b.getCreatedAt(),
                    b.getUpdatedAt() != null ? b.getUpdatedAt() : LocalDateTime.now()
                ).toDays())
            ));

        return new MetricsResponse(open, inProgress, resolved, archived,
                assignedPerUser, avgResolutionDays, avgResolutionDaysPerUser);
    }

    public MonthlyReportResponse getMonthlyReport(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDateTime startOfMonth = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = yearMonth.atEndOfMonth().atTime(23, 59, 59);

        List<Bug> openedBugs = bugRepository.findAll().stream()
            .filter(b -> b.getCreatedAt().isAfter(startOfMonth) && b.getCreatedAt().isBefore(endOfMonth))
            .toList();

        List<Bug> resolvedBugs = bugRepository.findAll().stream()
            .filter(b -> b.getStatus() == BugStatus.RESOLVED)
            .filter(b -> {
                // Find resolution date from history
                return historyRepository.findByBugIdOrderByAtAsc(b.getId()).stream()
                    .filter(h -> h.getAction() == com.bugboard26.model.HistoryAction.UPDATE)
                    .anyMatch(h -> h.getDetails() != null && h.getDetails().contains("status"));
            })
            .toList();

        Map<String, Long> resolvedPerUser = resolvedBugs.stream()
            .filter(b -> b.getAssignee() != null)
            .collect(Collectors.groupingBy(
                b -> b.getAssignee().getEmail(),
                Collectors.counting()
            ));

        double avgResolutionDays = resolvedBugs.stream()
            .mapToLong(b -> java.time.Duration.between(b.getCreatedAt(), LocalDateTime.now()).toDays())
            .average()
            .orElse(0.0);

        return new MonthlyReportResponse(openedBugs.size(), resolvedBugs.size(), resolvedPerUser, avgResolutionDays);
    }
}

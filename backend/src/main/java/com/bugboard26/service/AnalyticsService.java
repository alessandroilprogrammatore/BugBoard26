package com.bugboard26.service;

import com.bugboard26.dto.MetricsResponse;
import com.bugboard26.dto.MonthlyReportResponse;
import com.bugboard26.dto.MonthlyUserReportResponse;
import com.bugboard26.model.Bug;
import com.bugboard26.model.BugStatus;
import com.bugboard26.model.History;
import com.bugboard26.model.HistoryAction;
import com.bugboard26.model.Role;
import com.bugboard26.model.User;
import com.bugboard26.repository.BugRepository;
import com.bugboard26.repository.HistoryRepository;
import com.bugboard26.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
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
        LocalDateTime startOfNextMonth = yearMonth.plusMonths(1).atDay(1).atStartOfDay();

        List<Bug> allBugs = bugRepository.findAll();
        List<History> allHistory = historyRepository.findAll();

        List<Bug> openedBugs = allBugs.stream()
            .filter(b -> isWithinMonth(b.getCreatedAt(), startOfMonth, startOfNextMonth))
            .toList();

        Map<String, Long> openedPerUser = openedBugs.stream()
            .collect(Collectors.groupingBy(
                b -> b.getCreatedBy().getEmail(),
                Collectors.counting()
            ));

        Map<String, Long> managedPerUser = allHistory.stream()
            .filter(h -> h.getAction() != HistoryAction.CREATE)
            .filter(h -> isWithinMonth(h.getAt(), startOfMonth, startOfNextMonth))
            .collect(Collectors.groupingBy(
                h -> h.getWho().getEmail(),
                Collectors.mapping(h -> h.getBug().getId(), Collectors.collectingAndThen(Collectors.toSet(), set -> (long) set.size()))
            ));

        int managed = managedPerUser.values().stream()
            .mapToInt(Long::intValue)
            .sum();

        Map<UUID, List<History>> historyByBugId = allHistory.stream()
            .collect(Collectors.groupingBy(h -> h.getBug().getId()));

        List<ResolvedBugMetric> resolvedBugMetrics = allBugs.stream()
            .map(bug -> buildResolvedBugMetric(bug, historyByBugId.getOrDefault(bug.getId(), List.of())))
            .flatMap(Optional::stream)
            .filter(metric -> isWithinMonth(metric.resolvedAt(), startOfMonth, startOfNextMonth))
            .toList();

        Map<String, Long> resolvedPerUser = resolvedBugMetrics.stream()
            .collect(Collectors.groupingBy(
                ResolvedBugMetric::assigneeEmail,
                Collectors.counting()
            ));

        double avgResolutionDays = resolvedBugMetrics.stream()
            .mapToLong(ResolvedBugMetric::resolutionDays)
            .average()
            .orElse(0.0);

        Map<String, Double> avgResolutionDaysPerUser = resolvedBugMetrics.stream()
            .collect(Collectors.groupingBy(
                ResolvedBugMetric::assigneeEmail,
                Collectors.averagingDouble(ResolvedBugMetric::resolutionDays)
            ));

        List<MonthlyUserReportResponse> users = userRepository.findAll().stream()
            .filter(user -> user.getRole() != Role.READONLY)
            .sorted(java.util.Comparator.comparing(User::getEmail))
            .map(user -> new MonthlyUserReportResponse(
                user.getEmail(),
                openedPerUser.getOrDefault(user.getEmail(), 0L),
                managedPerUser.getOrDefault(user.getEmail(), 0L),
                resolvedPerUser.getOrDefault(user.getEmail(), 0L),
                avgResolutionDaysPerUser.getOrDefault(user.getEmail(), 0.0)
            ))
            .toList();

        return new MonthlyReportResponse(
            openedBugs.size(),
            managed,
            resolvedBugMetrics.size(),
            openedPerUser,
            managedPerUser,
            resolvedPerUser,
            avgResolutionDays,
            avgResolutionDaysPerUser,
            users
        );
    }

    private Optional<ResolvedBugMetric> buildResolvedBugMetric(Bug bug, List<History> bugHistory) {
        if (bug.getAssignee() == null) {
            return Optional.empty();
        }

        Optional<LocalDateTime> resolvedAt = bugHistory.stream()
            .filter(history -> history.getAction() == HistoryAction.UPDATE)
            .filter(history -> history.getDetails() != null && history.getDetails().contains("status"))
            .map(History::getAt)
            .max(LocalDateTime::compareTo);

        if (resolvedAt.isEmpty() && bug.getStatus() == BugStatus.RESOLVED) {
            resolvedAt = Optional.ofNullable(bug.getUpdatedAt());
        }

        if (resolvedAt.isEmpty()) {
            return Optional.empty();
        }

        long resolutionDays = Duration.between(bug.getCreatedAt(), resolvedAt.get()).toDays();
        return Optional.of(new ResolvedBugMetric(
            bug.getId(),
            bug.getAssignee().getEmail(),
            resolvedAt.get(),
            resolutionDays
        ));
    }

    private boolean isWithinMonth(LocalDateTime timestamp, LocalDateTime startInclusive, LocalDateTime endExclusive) {
        return timestamp != null
            && !timestamp.isBefore(startInclusive)
            && timestamp.isBefore(endExclusive);
    }

    private record ResolvedBugMetric(
        UUID bugId,
        String assigneeEmail,
        LocalDateTime resolvedAt,
        long resolutionDays
    ) {}
}

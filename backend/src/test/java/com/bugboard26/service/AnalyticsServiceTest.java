package com.bugboard26.service;

import com.bugboard26.dto.MonthlyReportResponse;
import com.bugboard26.dto.MonthlyUserReportResponse;
import com.bugboard26.model.Bug;
import com.bugboard26.model.BugStatus;
import com.bugboard26.model.BugType;
import com.bugboard26.model.History;
import com.bugboard26.model.HistoryAction;
import com.bugboard26.model.Role;
import com.bugboard26.model.User;
import com.bugboard26.repository.BugRepository;
import com.bugboard26.repository.HistoryRepository;
import com.bugboard26.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private BugRepository bugRepository;
    @Mock private UserRepository userRepository;
    @Mock private HistoryRepository historyRepository;

    private AnalyticsService analyticsService;

    private User adminUser;
    private User regularUser;
    private User readonlyUser;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(bugRepository, userRepository, historyRepository);

        adminUser = new User("admin@bugboard.com",
            "$2a$10$hashedpasswordXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "Admin User", Role.ADMIN);
        adminUser.setId(UUID.randomUUID());

        regularUser = new User("user@bugboard.com",
            "$2a$10$hashedpasswordXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "Regular User", Role.USER);
        regularUser.setId(UUID.randomUUID());

        readonlyUser = new User("readonly@bugboard.com",
            "$2a$10$hashedpasswordXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "Readonly User", Role.READONLY);
        readonlyUser.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("getMonthlyReport: filtra correttamente il mese e restituisce aggregate e dettaglio per utente")
    void getMonthlyReport_returnsMonthlyAggregateAndPerUserStats() {
        Bug resolvedInMarch = new Bug("Resolved in March", "desc", BugType.BUG, adminUser);
        resolvedInMarch.setId(UUID.randomUUID());
        resolvedInMarch.setCreatedAt(LocalDateTime.of(2026, 3, 2, 9, 0));
        resolvedInMarch.setUpdatedAt(LocalDateTime.of(2026, 4, 1, 9, 0));
        resolvedInMarch.setStatus(BugStatus.RESOLVED);
        resolvedInMarch.setAssignee(regularUser);

        Bug openedInMarch = new Bug("Opened in March", "desc", BugType.FEATURE, regularUser);
        openedInMarch.setId(UUID.randomUUID());
        openedInMarch.setCreatedAt(LocalDateTime.of(2026, 3, 20, 10, 0));
        openedInMarch.setUpdatedAt(LocalDateTime.of(2026, 3, 20, 10, 0));
        openedInMarch.setStatus(BugStatus.TODO);

        Bug managedInMarch = new Bug("Managed in March", "desc", BugType.DOCUMENTATION, adminUser);
        managedInMarch.setId(UUID.randomUUID());
        managedInMarch.setCreatedAt(LocalDateTime.of(2026, 2, 28, 12, 0));
        managedInMarch.setUpdatedAt(LocalDateTime.of(2026, 3, 5, 11, 0));
        managedInMarch.setStatus(BugStatus.IN_PROGRESS);
        managedInMarch.setAssignee(adminUser);

        Bug resolvedInFebruary = new Bug("Resolved in February", "desc", BugType.BUG, adminUser);
        resolvedInFebruary.setId(UUID.randomUUID());
        resolvedInFebruary.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        resolvedInFebruary.setUpdatedAt(LocalDateTime.of(2026, 2, 15, 18, 0));
        resolvedInFebruary.setStatus(BugStatus.RESOLVED);
        resolvedInFebruary.setAssignee(regularUser);

        History marchResolution = new History(resolvedInMarch, regularUser, HistoryAction.UPDATE, "status");
        marchResolution.setAt(LocalDateTime.of(2026, 3, 10, 15, 0));

        History marchComment = new History(managedInMarch, adminUser, HistoryAction.COMMENT, "follow-up");
        marchComment.setAt(LocalDateTime.of(2026, 3, 5, 11, 0));

        History febResolution = new History(resolvedInFebruary, regularUser, HistoryAction.UPDATE, "status");
        febResolution.setAt(LocalDateTime.of(2026, 2, 15, 18, 0));

        when(bugRepository.findAll()).thenReturn(List.of(
            resolvedInMarch,
            openedInMarch,
            managedInMarch,
            resolvedInFebruary
        ));
        when(historyRepository.findAll()).thenReturn(List.of(
            marchResolution,
            marchComment,
            febResolution
        ));
        when(userRepository.findAll()).thenReturn(List.of(adminUser, regularUser, readonlyUser));

        MonthlyReportResponse report = analyticsService.getMonthlyReport(2026, 3);

        assertThat(report.opened()).isEqualTo(2);
        assertThat(report.managed()).isEqualTo(2);
        assertThat(report.resolved()).isEqualTo(1);
        assertThat(report.openedPerUser()).isEqualTo(Map.of(
            "admin@bugboard.com", 1L,
            "user@bugboard.com", 1L
        ));
        assertThat(report.managedPerUser()).isEqualTo(Map.of(
            "admin@bugboard.com", 1L,
            "user@bugboard.com", 1L
        ));
        assertThat(report.resolvedPerUser()).isEqualTo(Map.of(
            "user@bugboard.com", 1L
        ));
        assertThat(report.avgResolutionDays()).isEqualTo(8.0);
        assertThat(report.avgResolutionDaysPerUser()).isEqualTo(Map.of(
            "user@bugboard.com", 8.0
        ));

        assertThat(report.users()).extracting(MonthlyUserReportResponse::email)
            .containsExactly("admin@bugboard.com", "user@bugboard.com");

        MonthlyUserReportResponse adminStats = report.users().stream()
            .filter(user -> user.email().equals("admin@bugboard.com"))
            .findFirst()
            .orElseThrow();
        MonthlyUserReportResponse regularStats = report.users().stream()
            .filter(user -> user.email().equals("user@bugboard.com"))
            .findFirst()
            .orElseThrow();

        assertThat(adminStats.opened()).isEqualTo(1);
        assertThat(adminStats.managed()).isEqualTo(1);
        assertThat(adminStats.resolved()).isZero();
        assertThat(adminStats.avgResolutionDays()).isZero();
        assertThat(regularStats.opened()).isEqualTo(1);
        assertThat(regularStats.managed()).isEqualTo(1);
        assertThat(regularStats.resolved()).isEqualTo(1);
        assertThat(regularStats.avgResolutionDays()).isEqualTo(8.0);
    }
}

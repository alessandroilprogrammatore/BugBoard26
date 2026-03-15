package com.bugboard26.service;

import com.bugboard26.model.Bug;
import com.bugboard26.model.BugStatus;
import com.bugboard26.repository.BugRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled service that automatically archives bugs in RESOLVED status
 * that have been inactive for more than 30 days.
 * Runs every day at midnight (server timezone).
 */
@Service
public class ScheduledArchiveService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledArchiveService.class);
    private static final int INACTIVITY_DAYS = 30;

    private final BugRepository bugRepository;

    public ScheduledArchiveService(BugRepository bugRepository) {
        this.bugRepository = bugRepository;
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void archiveInactiveBugs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(INACTIVITY_DAYS);

        List<Bug> staleBugs = bugRepository
                .findByStatusAndArchivedFalseAndUpdatedAtBefore(BugStatus.RESOLVED, cutoff);

        if (staleBugs.isEmpty()) {
            log.info("Scheduled archive: no inactive RESOLVED bugs found.");
            return;
        }

        for (Bug bug : staleBugs) {
            bug.setArchived(true);
            bug.setStatus(BugStatus.ARCHIVED);
        }

        bugRepository.saveAll(staleBugs);
        log.info("Scheduled archive: archived {} bug(s) inactive for over {} days.",
                staleBugs.size(), INACTIVITY_DAYS);
    }
}

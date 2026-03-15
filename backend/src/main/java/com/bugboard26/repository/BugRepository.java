package com.bugboard26.repository;

import com.bugboard26.model.Bug;
import com.bugboard26.model.BugStatus;
import com.bugboard26.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface BugRepository extends JpaRepository<Bug, UUID>, JpaSpecificationExecutor<Bug> {
    long countByAssigneeAndStatusIn(User assignee, Collection<BugStatus> statuses);

    List<Bug> findByStatusAndArchivedFalseAndUpdatedAtBefore(BugStatus status, LocalDateTime cutoff);
}

package com.bugboard26.repository;

import com.bugboard26.model.Bug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface BugRepository extends JpaRepository<Bug, UUID>, JpaSpecificationExecutor<Bug> {
}

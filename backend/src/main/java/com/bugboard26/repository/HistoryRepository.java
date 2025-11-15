package com.bugboard26.repository;

import com.bugboard26.model.History;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface HistoryRepository extends JpaRepository<History, UUID> {
    List<History> findByBugIdOrderByAtAsc(UUID bugId);
}

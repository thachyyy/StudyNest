# Security Specification & Threat Model for Synapse Edu AI

## 1. Data Invariants
- **Materials**: Must have non-empty `title`, `subject`, `classGroup`, `nextLessonContent`, and `createdAt`. Content cannot exceed size constraints.
- **Students**: Identity must be protected. Sensitive progress states and review statuses are validated.
- **Conversations**: Messages must be an array with size <= 100. Student ID cannot be spoofed. Prompt evaluations must have scores bounded between 0 and 100.
- **Quizzes**: Each quiz must link to a valid material and contain valid question definitions.
- **Quiz Submissions**: Scores must be between 0 and 100. Once submitted, submissions are immutable.

## 2. The "Dirty Dozen" Payloads (Must be blocked by security rules)
1. **Unauthenticated Write**: Writing material without auth.
2. **Resource Poisoning**: Material with title exceeding 200 chars or 50MB content payload.
3. **Ghost / Shadow Field Injection**: Injecting `isAdmin: true` or `verified: true` into a student record.
4. **ID Traversal Poisoning**: Document ID with invalid path characters or > 128 characters.
5. **Prompt Score Tampering**: Submission with `score: 999` or `overallPromptQualityScore: -50`.
6. **Student ID Spoofing**: Submitting quiz responses under another student's account.
7. **Array Bombing**: Submitting a conversation with > 200 message objects to cause client memory exhaustion.
8. **Orphaned Quiz Submission**: Submission referencing non-existent quiz ID.
9. **Post-Submission Tampering**: Updating an already submitted quiz score from 40 to 100.
10. **Arbitrary List Query Scraping**: Attempting to query conversations of all other classes.
11. **Negative Progress Percentage**: Setting `prepProgressPercent: -20` or `prepProgressPercent: 500`.
12. **System Tip Overwrite**: Modifying AI prompt critique evaluations directly via malicious client payload.
